#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <algorithm>
#include <cctype>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Taxonomy Rules Structure definition
struct TagRule {
    std::string tag_name;
    std::vector<std::string> keywords;
};

// 1. Required global callback for libcurl to write HTTP responses
static size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* out) {
    size_t total_size = size * nmemb;
    out->append(static_cast<char*>(contents), total_size);
    return total_size;
}

// 2. Standard string trimmer
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n\"");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n\"");
    return str.substr(first, (last - first + 1));
}

// 3. String to lowercase converter
std::string to_lower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(), [](unsigned char c) {
        return std::tolower(c);
    });
    return r;
}

bool is_word_char(char c) {
    return std::isalnum(static_cast<unsigned char>(c)) || c == '_';
}

bool contains_phrase(const std::string& text, const std::string& phrase) {
    size_t pos = 0;
    while ((pos = text.find(phrase, pos)) != std::string::npos) {
        bool left_ok = pos == 0 || !is_word_char(text[pos - 1]);
        size_t end = pos + phrase.length();
        bool right_ok = end >= text.length() || !is_word_char(text[end]);
        if (left_ok && right_ok) return true;
        pos = end;
    }
    return false;
}

int count_phrase_hits(const std::string& text, const std::vector<std::string>& keywords) {
    int hits = 0;
    for (const std::string& kw : keywords) {
        if (contains_phrase(text, kw)) hits++;
    }
    return hits;
}

std::string join_tags(const std::vector<std::string>& tags) {
    std::string out;
    for (const std::string& tag : tags) {
        if (!out.empty()) out += ";";
        out += tag;
    }
    return out;
}

bool has_tag(const std::vector<std::string>& tags, const std::string& tag) {
    return std::find(tags.begin(), tags.end(), tag) != tags.end();
}

void add_tag(std::vector<std::string>& tags, const std::string& tag) {
    if (!has_tag(tags, tag)) tags.push_back(tag);
}

// A suggested tag plus WHERE the evidence for it came from. This is the
// key addition: "high" confidence means the title or description itself
// (text the comedian/channel wrote) supports the tag -- essentially
// sarcasm-proof. "low" confidence means the tag only showed up because
// of comment text, which for Indian YouTube comment sections especially
// is genuinely unreliable (sarcasm, meme-speak, hyperbole). Only "low"
// confidence tags are worth your manual double-checking time.
struct TaggedResult {
    std::string tag_name;
    std::string confidence; // "high" or "low"
};

void add_tagged(std::vector<TaggedResult>& results, const std::string& tag, const std::string& confidence) {
    for (auto& r : results) {
        if (r.tag_name == tag) {
            // If we already have this tag at "low" confidence and now find
            // high-confidence evidence too, upgrade it.
            if (confidence == "high") r.confidence = "high";
            return;
        }
    }
    results.push_back({tag, confidence});
}

std::vector<TaggedResult> suggest_tag_list(
    const std::string& title_text,
    const std::string& description_text,
    const std::vector<std::string>& comments,
    const std::vector<TagRule>& rules,
    int title_weight,
    int description_weight,
    int min_score,
    int min_comment_mentions
) {
    std::vector<TaggedResult> result;

    for (const TagRule& rule : rules) {
        int title_hits = count_phrase_hits(title_text, rule.keywords);
        int desc_hits = count_phrase_hits(description_text, rule.keywords);
        int comment_mentions = 0;

        for (const std::string& comment : comments) {
            if (count_phrase_hits(comment, rule.keywords) > 0) {
                comment_mentions++;
            }
        }

        int score = (title_hits * title_weight) + (desc_hits * description_weight) + comment_mentions;
        bool trusted_evidence = (title_hits > 0 || desc_hits > 0);

        if (trusted_evidence) {
            add_tagged(result, rule.tag_name, "high");
        } else if (score >= min_score && comment_mentions >= min_comment_mentions) {
            add_tagged(result, rule.tag_name, "low");
        }
    }

    return result;
}

std::string join_tagged(const std::vector<TaggedResult>& tags) {
    std::string out;
    for (const auto& t : tags) {
        if (!out.empty()) out += ";";
        out += t.tag_name;
    }
    return out;
}

std::string join_low_confidence(const std::vector<TaggedResult>& tags) {
    std::string out;
    for (const auto& t : tags) {
        if (t.confidence != "low") continue;
        if (!out.empty()) out += ";";
        out += t.tag_name;
    }
    return out;
}

void apply_title_fallbacks(
    const std::string& title_text,
    std::vector<std::string>& style_tags,
    std::vector<std::string>& tone_tags,
    std::vector<std::string>& theme_tags
) {
    // These fallbacks use only the title, so they are safer than broad comment matching.
    if (contains_phrase(title_text, "stand up comedy") || contains_phrase(title_text, "stand-up comedy") ||
        contains_phrase(title_text, "full special") || contains_phrase(title_text, "comedy special") ||
        contains_phrase(title_text, "full episode") || contains_phrase(title_text, "comedy reaction")) {
        add_tag(style_tags, "observational-comedy");
    }

    if (contains_phrase(title_text, "crowd work") || contains_phrase(title_text, "crowdwork") ||
        contains_phrase(title_text, "roast") || contains_phrase(title_text, "heckler") ||
        contains_phrase(title_text, "latent")) {
        add_tag(style_tags, "crowd-work-heavy");
    }

    if (contains_phrase(title_text, "story") || contains_phrase(title_text, "stories") ||
        contains_phrase(title_text, "kissa") || contains_phrase(title_text, "bachpan")) {
        add_tag(style_tags, "anecdotal-storytelling");
    }

    if (contains_phrase(title_text, "one liner") || contains_phrase(title_text, "one-liner") ||
        contains_phrase(title_text, "jokes")) {
        add_tag(style_tags, "rapid-fire-one-liners");
    }

    if (contains_phrase(title_text, "shayar") || contains_phrase(title_text, "song") ||
        contains_phrase(title_text, "singing") || contains_phrase(title_text, "guitar")) {
        add_tag(style_tags, "musical-standup");
    }

    if (contains_phrase(title_text, "school") || contains_phrase(title_text, "college") ||
        contains_phrase(title_text, "bachpan") || contains_phrase(title_text, "childhood")) {
        add_tag(tone_tags, "nostalgic-and-warm");
        add_tag(theme_tags, "family-and-upbringing");
    }

    if (contains_phrase(title_text, "parents") || contains_phrase(title_text, "family") ||
        contains_phrase(title_text, "mom") || contains_phrase(title_text, "dad") ||
        contains_phrase(title_text, "papa") || contains_phrase(title_text, "mummy")) {
        add_tag(theme_tags, "family-and-upbringing");
    }

    if (contains_phrase(title_text, "corporate") || contains_phrase(title_text, "job") ||
        contains_phrase(title_text, "employee") || contains_phrase(title_text, "office") ||
        contains_phrase(title_text, "boss") || contains_phrase(title_text, "engineer")) {
        add_tag(theme_tags, "corporate-and-work-life");
    }

    if (contains_phrase(title_text, "anxiety") || contains_phrase(title_text, "depression") ||
        contains_phrase(title_text, "therapy") || contains_phrase(title_text, "trauma") ||
        contains_phrase(title_text, "mental health")) {
        add_tag(theme_tags, "mental-health-and-struggles");
    }

    if (contains_phrase(title_text, "girlfriend") || contains_phrase(title_text, "boyfriend") ||
        contains_phrase(title_text, "relationship") || contains_phrase(title_text, "love") ||
        contains_phrase(title_text, "cheating") ||
        contains_phrase(title_text, "wife") || contains_phrase(title_text, "husband")) {
        add_tag(theme_tags, "romantic-relationships");
    }

    if (contains_phrase(title_text, "flight") || contains_phrase(title_text, "airport") ||
        contains_phrase(title_text, "train") || contains_phrase(title_text, "traffic")) {
        add_tag(theme_tags, "everyday-absurdities");
    }

    if (contains_phrase(title_text, "trip") || contains_phrase(title_text, "travel") ||
        contains_phrase(title_text, "travellers") || contains_phrase(title_text, "euro trip") ||
        contains_phrase(title_text, "goa") || contains_phrase(title_text, "hotel")) {
        add_tag(theme_tags, "travel-and-experiences");
    }

    if (contains_phrase(title_text, "political") || contains_phrase(title_text, "trump") ||
        contains_phrase(title_text, "government") || contains_phrase(title_text, "modi") ||
        contains_phrase(title_text, "election")) {
        add_tag(theme_tags, "political-satire");
    }

    if (contains_phrase(title_text, "class") ||
        contains_phrase(title_text, "women") || contains_phrase(title_text, "india's got latent")) {
        add_tag(theme_tags, "cultural-commentary");
    }

    if (contains_phrase(title_text, "dark") || contains_phrase(title_text, "black comedy")) {
        add_tag(tone_tags, "dark-and-cynical");
    }

    if (contains_phrase(title_text, "roast") || contains_phrase(title_text, "insult") ||
        contains_phrase(title_text, "savage")) {
        add_tag(tone_tags, "sarcastic-and-biting");
    }

    if (contains_phrase(title_text, "adult") || contains_phrase(title_text, "sex") ||
        contains_phrase(title_text, "dirty") || contains_phrase(title_text, "18+")) {
        add_tag(tone_tags, "raunchy-and-explicit");
    }
}

// 4. Standard CSV escape function
std::string escape_csv(const std::string& field) {
    std::string esc = "\"";
    for (char c : field) {
        if (c == '"') esc += "\"\"";
        else esc += c;
    }
    esc += "\"";
    return esc;
}

// 5. CSV Line Parser
std::vector<std::string> parse_csv_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string field = "";
    bool in_quotes = false;
    for (size_t i = 0; i < line.length(); ++i) {
        char c = line[i];
        if (in_quotes) {
            if (c == '"') {
                if (i + 1 < line.size() && line[i + 1] == '"') { field += '"'; ++i; }
                else in_quotes = false;
            } else field += c;
        } else {
            if (c == '"') in_quotes = true;
            else if (c == ',') { fields.push_back(field); field.clear(); }
            else field += c;
        }
    }
    fields.push_back(field);
    return fields;
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        std::cout << "Usage: ./suggest_tags <API_KEY> <input_csv> <output_csv>\n";
        return 1;
    }

    std::string api_key = argv[1];
    std::string input_path = argv[2];
    std::string output_path = argv[3];

    std::ifstream in(input_path);
    if (!in.is_open()) {
        std::cout << "Error: Could not open input CSV: " << input_path << "\n";
        return 1;
    }

    std::ofstream out(output_path);
    if (!out.is_open()) {
        std::cout << "Error: Could not create output CSV: " << output_path << "\n";
        return 1;
    }

    curl_global_init(CURL_GLOBAL_DEFAULT);

    out << "video_id,title,style_tags,tone_tags,theme_tags,suggested_rating,youtube_age_restricted,"
           "review_priority,low_confidence_tags\n";

    // --------------------------------------------------------------------------------
    // TAXONOMY DICTIONARIES
    // --------------------------------------------------------------------------------
    std::vector<TagRule> style_rules = {
        {"anecdotal-storytelling", {"story time", "storytelling", "narrative", "kissa", "kahani", "bachpan ka kissa", "told the story"}},
        {"observational-comedy",   {"observational", "relatable comedy", "true observation", "exactly what happens"}},
        {"crowd-work-heavy",       {"crowd work", "crowdwork", "audience interaction", "roasted the audience", "audience ko roast", "front row", "heckler", "heckling"}},
        {"physical-and-energetic", {"high energy", "energetic", "physical comedy", "acting it out", "facial expressions", "mimicry"}},
        {"deadpan-delivery",       {"deadpan", "straight face", "monotone", "serious face"}},
        {"musical-standup",        {"guitar", "singing", "musical comedy", "musical standup", "piano"}},
        {"rapid-fire-one-liners",  {"one liner", "one-liner", "punchline", "quick jokes"}}
    };

    std::vector<TagRule> tone_rules = {
        {"dark-and-cynical",       {"dark humor", "dark humour", "dark comedy", "cynical", "twisted humor"}},
        {"self-deprecating-humor", {"self deprecating", "self-deprecating", "roasting himself", "roasting herself", "apni beizzati", "apna mazak", "insulting himself"}},
        {"sarcastic-and-biting",   {"sarcastic", "sarcasm", "satire", "biting", "sharp jokes"}},
        {"wholesome-and-lighthearted", {"wholesome", "heartwarming", "feel good", "family friendly", "parivaar ke sath"}},
        {"nostalgic-and-warm",     {"nostalgic", "nostalgia", "school days", "90s kids", "bachpan", "purane din", "college days", "those days"}},
        {"absurdist-and-surreal",  {"absurd", "surreal", "bizarre", "makes no sense but funny"}},
        {"raunchy-and-explicit",   {"dirty jokes", "double meaning", "adult comedy", "vulgar", "ashleel"}}
    };

    std::vector<TagRule> theme_rules = {
        {"family-and-upbringing",      {"parents", "mom", "dad", "siblings", "mummy", "papa", "desi family", "middle class family", "bhai behen", "family issues", "family drama"}},
        {"romantic-relationships",     {"relationship", "girlfriend", "boyfriend", "dating", "breakup", "shaadi", "pyaar", "couple", "wife", "husband", "biwi", "pati"}},
        {"corporate-and-work-life",    {"office", "job", "corporate", "boss", "workplace", "engineering", "engineer", "manager", "btech", "salary", "interview"}},
        {"cultural-commentary",        {"social commentary", "society", "class divide", "middle class", "mumbai vs delhi", "rich vs poor", "culture"}},
        {"political-satire",           {"political", "politics", "government", "election", "modi", "bjp", "congress", "neta"}},
        {"mental-health-and-struggles",{"anxiety", "depression", "therapy", "trauma", "mental health", "stress", "overthinking", "lonely"}},
        {"everyday-absurdities",       {"traffic", "flight", "airport", "driving", "auto wala", "cab", "local train", "metro"}},
        {"travel-and-experiences",     {"trip", "travel", "goa", "hotel", "vacation", "tour", "tourist"}}
    };

    std::vector<TagRule> mild_mature_rules = {
        {"mild-language", {"damn", "hell", "crap", "hot topic", "bold jokes", "saala", "kutta", "pagal"}},
        {"innuendo",      {"innuendo", "sexual joke", "adult joke", "nsfw-ish", "double meaning"}}
    };

    std::vector<TagRule> strong_mature_rules = {
        {"strong-language",  {"cuss words", "swearing", "f bomb", "explicit language", "abusive language", "mc", "bc", "bhenchod", "madarchod", "gali", "gaali", "chutiya"}},
        {"sexual-content",   {"sexual content", "explicit jokes", "nsfw content", "sex joke"}},
        {"substance-use",    {"drug joke", "drugs", "weed jokes", "alcohol jokes", "getting high", "daaru", "nashe", "smoking", "sutta", "sharab"}},
        {"graphic-violence", {"graphic", "violent joke", "gore", "khoon"}}
    };

    std::string line;
    int processed = 0;
    int video_id_col = -1;
    int title_col = -1;
    bool is_first_line = true;
    bool hit_eof = false;

    // --------------------------------------------------------------------------------
    // FILE READING & PROCESSING LOGIC
    // --------------------------------------------------------------------------------
    while (true) {
        line.clear();
        std::streambuf* sb = in.rdbuf();
        
        while (true) {
            int c = sb->sbumpc();
            if (c == EOF) {
                hit_eof = true;
                break;
            }
            if (c == '\n') break;
            if (c == '\r') {
                if (sb->sgetc() == '\n') sb->sbumpc();
                break;
            }
            line += (char)c;
        }
        
        if (hit_eof && line.empty()) break;
        if (line.empty()) continue;

        std::vector<std::string> fields = parse_csv_line(line);

        if (is_first_line) {
            for (size_t i = 0; i < fields.size(); ++i) {
                std::string h = to_lower(trim(fields[i]));
                if (h.find("video_id") != std::string::npos) video_id_col = i;
                if (h.find("title") != std::string::npos) title_col = i;
            }
            is_first_line = false;
            continue;
        }

        if (video_id_col == -1 || title_col == -1) {
            std::cout << "Error: input CSV must contain video_id and title columns.\n";
            break;
        }
        if ((int)fields.size() <= std::max(video_id_col, title_col)) continue;

        std::string video_id = trim(fields[video_id_col]);
        std::string title = trim(fields[title_col]);
        std::string title_text = to_lower(title);
        std::vector<std::string> comment_texts;

        // Fetch Comments from YouTube API
        std::string comments_url = "https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=" 
                                   + video_id + "&maxResults=50&order=relevance&textFormat=plainText&key=" + api_key;
        
        std::string comments_response;
        CURL* curl1 = curl_easy_init();
        if (curl1) {
            curl_easy_setopt(curl1, CURLOPT_URL, comments_url.c_str());
            curl_easy_setopt(curl1, CURLOPT_WRITEFUNCTION, write_callback);
            curl_easy_setopt(curl1, CURLOPT_WRITEDATA, &comments_response);
            curl_easy_setopt(curl1, CURLOPT_TIMEOUT, 15L); 
            curl_easy_setopt(curl1, CURLOPT_CONNECTTIMEOUT, 10L);
            curl_easy_perform(curl1);
            curl_easy_cleanup(curl1);
        }

        try {
            json data = json::parse(comments_response);
            
            // Check for quota limits or API errors
            if (data.contains("error")) {
                std::cout << "\n[API WARNING] Error on video " << video_id << ": " << data["error"]["message"] << "\n";
            } 
            else if (data.contains("items")) {
                for (size_t i = 0; i < data["items"].size(); ++i) {
                    // INNER TRY-CATCH: Prevents one malformed comment from destroying the whole batch
                    try {
                        if (data["items"][i]["snippet"]["topLevelComment"]["snippet"].contains("textDisplay")) {
                            std::string text = data["items"][i]["snippet"]["topLevelComment"]["snippet"]["textDisplay"].get<std::string>();
                            comment_texts.push_back(to_lower(text));
                        }
                    } catch (...) {
                        // Silently skip the broken comment and continue to the next one
                        continue;
                    }
                }
            }
        } catch (...) {
            std::cout << "\n[WARNING] Failed to parse JSON for video: " << video_id << "\n";
        }

        // Fetch description + age restriction in ONE call (part=snippet,contentDetails)
        // instead of two separate requests -- description is a free, trustworthy
        // signal (written by the comedian/channel, not sarcasm-prone like comments)
        // that costs nothing extra to grab alongside the age-rating check.
        std::string info_url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=" 
                              + video_id + "&key=" + api_key;
        std::string info_response;
        bool is_age_restricted = false;
        std::string description_text;
        
        CURL* curl2 = curl_easy_init();
        if (curl2) {
            curl_easy_setopt(curl2, CURLOPT_URL, info_url.c_str());
            curl_easy_setopt(curl2, CURLOPT_WRITEFUNCTION, write_callback);
            curl_easy_setopt(curl2, CURLOPT_WRITEDATA, &info_response);
            curl_easy_setopt(curl2, CURLOPT_TIMEOUT, 15L); 
            curl_easy_setopt(curl2, CURLOPT_CONNECTTIMEOUT, 10L);
            curl_easy_perform(curl2);
            curl_easy_cleanup(curl2);
        }

        try {
            json data = json::parse(info_response);
            if (data.contains("items") && !data["items"].empty()) {
                try {
                    if (data["items"][0].contains("snippet") &&
                        data["items"][0]["snippet"].contains("description")) {
                        description_text = to_lower(data["items"][0]["snippet"]["description"].get<std::string>());
                    }
                } catch (...) {}
                try {
                    if (data["items"][0].contains("contentDetails")) {
                        auto details = data["items"][0]["contentDetails"];
                        if (details.contains("contentRating") && details["contentRating"].contains("ytRating")) {
                            if (details["contentRating"]["ytRating"] == "ytAgeRestricted") {
                                is_age_restricted = true;
                            }
                        }
                    }
                } catch (...) {}
            }
        } catch (...) {}

        // --------------------------------------------------------------------------------
        // INLINE TAG MATCHING LOGIC 
        // --------------------------------------------------------------------------------
        int mild_hits = 0, strong_hits = 0;

        // Style: fairly sarcasm-proof, comments can weigh in normally.
        auto style_tagged = suggest_tag_list(title_text, description_text, comment_texts, style_rules, 3, 2, 2, 2);
        // Tone: this is exactly where sarcasm/hyperbole in comments bites you --
        // require MORE independent comment mentions (4 instead of 2) before a
        // comment-only tone tag is even offered as a "low confidence" suggestion.
        auto tone_tagged  = suggest_tag_list(title_text, description_text, comment_texts, tone_rules, 3, 2, 4, 4);
        auto theme_tagged = suggest_tag_list(title_text, description_text, comment_texts, theme_rules, 4, 3, 3, 3);

        // Title-only fallback rules are inherently high-confidence (literal
        // text from the video's own title), so anything they add gets folded
        // in at "high" confidence.
        std::vector<std::string> fallback_style, fallback_tone, fallback_theme;
        apply_title_fallbacks(title_text, fallback_style, fallback_tone, fallback_theme);
        for (auto& t : fallback_style) add_tagged(style_tagged, t, "high");
        for (auto& t : fallback_tone)  add_tagged(tone_tagged, t, "high");
        for (auto& t : fallback_theme) add_tagged(theme_tagged, t, "high");

        std::string style_res = join_tagged(style_tagged);
        std::string tone_res = join_tagged(tone_tagged);
        std::string theme_res = join_tagged(theme_tagged);

        // Collect every tag that survived ONLY on comment evidence, across all
        // three categories -- this is your actual manual-review list. Anything
        // not in this column was backed by the title or description and can
        // be trusted without a re-check.
        std::string low_confidence_tags = join_low_confidence(style_tagged) ;
        {
            std::string t = join_low_confidence(tone_tagged);
            if (!t.empty()) low_confidence_tags += (low_confidence_tags.empty() ? "" : ";") + t;
        }
        {
            std::string t = join_low_confidence(theme_tagged);
            if (!t.empty()) low_confidence_tags += (low_confidence_tags.empty() ? "" : ";") + t;
        }
        std::string review_priority = low_confidence_tags.empty() ? "LOW" : "HIGH";

        // Process maturity rules from title only. Audience comments often contain abuse
        // that should not change the video's actual content rating.
        for (size_t i = 0; i < mild_mature_rules.size(); ++i) {
            for (size_t j = 0; j < mild_mature_rules[i].keywords.size(); ++j) {
                std::string kw = mild_mature_rules[i].keywords[j];
                if (contains_phrase(title_text, kw)) {
                    mild_hits++;
                }
            }
        }

        for (size_t i = 0; i < strong_mature_rules.size(); ++i) {
            for (size_t j = 0; j < strong_mature_rules[i].keywords.size(); ++j) {
                std::string kw = strong_mature_rules[i].keywords[j];
                if (contains_phrase(title_text, kw)) {
                    strong_hits++;
                }
            }
        }

        // Determine Final Rating
        std::string suggested_rating = "U/A";
        if (is_age_restricted || strong_hits >= 2) suggested_rating = "18+";
        else if (strong_hits >= 1 || mild_hits >= 3) suggested_rating = "16+";
        else if (mild_hits >= 1) suggested_rating = "13+";

        // Write row to output CSV
        out << escape_csv(video_id) << "," << escape_csv(title) << ","
            << escape_csv(style_res) << "," << escape_csv(tone_res) << "," << escape_csv(theme_res) << ","
            << escape_csv(suggested_rating) << "," << (is_age_restricted ? "TRUE" : "FALSE") << ","
            << review_priority << "," << escape_csv(low_confidence_tags) << "\n";

        processed++;
        if (processed % 10 == 0) std::cout << "Processed " << processed << " videos...\n";
    }

    in.close();
    out.close();
    curl_global_cleanup();

    std::cout << "\nSUCCESS! Processed " << processed << " videos.\n";
    std::cout << "High-Quality Tags saved to: " << output_path << "\n";
    return 0;
}