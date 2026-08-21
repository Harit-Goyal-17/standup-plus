// fetch_standup_data.cpp
//
// Fetches standup comedy video metadata from the YouTube Data API v3
// and writes it to a CSV file for later use in your recommender system.
//
// WORKFLOW:
//   1. search_videos()  -> queries YouTube for videos matching a keyword,
//                          returns a list of video IDs (cheap on info,
//                          but each call costs 100 quota units)
//   2. get_video_details() -> takes those IDs (up to 50 at a time) and
//                          pulls full details (costs ~1 quota unit total
//                          per call, regardless of how many IDs, up to 50)
//   3. Results are written to standup_videos.csv
//
// BUILD:
//   g++ -std=c++17 fetch_standup_data.cpp -o fetch_standup_data -lcurl
//
// RUN:
//   ./fetch_standup_data YOUR_API_KEY "stand up comedy special" 50
//
//   arg1 = your YouTube Data API key
//   arg2 = search query (wrap in quotes if it has spaces)
//   arg3 = how many videos to fetch (max 50 per search page; this demo
//          fetches a single page — see notes at bottom for pagination)

#include <iostream>
#include <string>
#include <vector>
#include <fstream>
#include <sstream>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// libcurl needs a callback to collect the response body as it arrives.
// This just appends each chunk into a std::string we control.
static size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* out) {
    size_t total_size = size * nmemb;
    out->append(static_cast<char*>(contents), total_size);
    return total_size;
}

// Performs a GET request to the given URL and returns the raw response body.
std::string http_get(const std::string& url) {
    CURL* curl = curl_easy_init();
    std::string response;

    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);

        CURLcode res = curl_easy_perform(curl);
        if (res != CURLE_OK) {
            std::cerr << "curl error: " << curl_easy_strerror(res) << std::endl;
        }
        curl_easy_cleanup(curl);
    }
    return response;
}

// URL-encodes a query string (spaces, quotes, etc. need escaping for a valid URL).
std::string url_encode(const std::string& value) {
    CURL* curl = curl_easy_init();
    char* encoded = curl_easy_escape(curl, value.c_str(), value.length());
    std::string result(encoded);
    curl_free(encoded);
    curl_easy_cleanup(curl);
    return result;
}

// Escapes a field for safe CSV writing (wraps in quotes, doubles any internal quotes).
std::string csv_escape(const std::string& field) {
    std::string escaped = "\"";
    for (char c : field) {
        if (c == '"') escaped += "\"\"";
        else if (c == '\n' || c == '\r') continue; // strip newlines from descriptions
        else escaped += c;
    }
    escaped += "\"";
    return escaped;
}

// Step 1: search for videos matching a query, return their video IDs.
std::vector<std::string> search_videos(const std::string& api_key,
                                        const std::string& query,
                                        int max_results) {
    std::vector<std::string> video_ids;

    std::string url = "https://www.googleapis.com/youtube/v3/search"
                       "?part=snippet"
                       "&type=video"
                       "&videoDuration=long"        // filters out short clips, favors full specials
                       "&maxResults=" + std::to_string(std::min(max_results, 50)) +
                       "&q=" + url_encode(query) +
                       "&key=" + api_key;

    std::string response = http_get(url);
    json data = json::parse(response, nullptr, false);

    if (data.is_discarded() || !data.contains("items")) {
        std::cerr << "Search request failed or returned no items. Raw response:\n"
                  << response << std::endl;
        return video_ids;
    }

    for (auto& item : data["items"]) {
        if (item.contains("id") && item["id"].contains("videoId")) {
            video_ids.push_back(item["id"]["videoId"].get<std::string>());
        }
    }
    return video_ids;
}

// A single row of video data we care about for the recommender.
struct VideoRecord {
    std::string video_id;
    std::string title;
    std::string channel_title;
    std::string thumbnail_url;
    std::string duration;     // ISO 8601 format, e.g. PT58M12S
    std::string published_at;
    long long view_count = 0;
    long long like_count = 0;
};

// Step 2: given up to 50 video IDs, fetch full details in a single call.
std::vector<VideoRecord> get_video_details(const std::string& api_key,
                                            const std::vector<std::string>& ids) {
    std::vector<VideoRecord> records;
    if (ids.empty()) return records;

    // Join IDs with commas: id1,id2,id3,...
    std::string joined_ids;
    for (size_t i = 0; i < ids.size(); ++i) {
        joined_ids += ids[i];
        if (i != ids.size() - 1) joined_ids += ",";
    }

    std::string url = "https://www.googleapis.com/youtube/v3/videos"
                       "?part=snippet,contentDetails,statistics"
                       "&id=" + joined_ids +
                       "&key=" + api_key;

    std::string response = http_get(url);
    json data = json::parse(response, nullptr, false);

    if (data.is_discarded() || !data.contains("items")) {
        std::cerr << "Video details request failed. Raw response:\n" << response << std::endl;
        return records;
    }

    for (auto& item : data["items"]) {
        VideoRecord rec;
        rec.video_id = item.value("id", "");

        auto snippet = item.value("snippet", json::object());
        rec.title = snippet.value("title", "");
        rec.channel_title = snippet.value("channelTitle", "");
        rec.published_at = snippet.value("publishedAt", "");

        // Grab the highest-resolution thumbnail available.
        if (snippet.contains("thumbnails") && snippet["thumbnails"].contains("high")) {
            rec.thumbnail_url = snippet["thumbnails"]["high"].value("url", "");
        }

        auto content = item.value("contentDetails", json::object());
        rec.duration = content.value("duration", "");

        auto stats = item.value("statistics", json::object());
        // Counts come back as strings in the API response, so we parse them.
        if (stats.contains("viewCount"))
            rec.view_count = std::stoll(stats["viewCount"].get<std::string>());
        if (stats.contains("likeCount"))
            rec.like_count = std::stoll(stats["likeCount"].get<std::string>());

        records.push_back(rec);
    }
    return records;
}

int main(int argc, char* argv[]) {
    if (argc < 4) {
        std::cerr << "Usage: " << argv[0] << " <API_KEY> <search_query> <max_results>\n";
        return 1;
    }

    std::string api_key = argv[1];
    std::string query = argv[2];
    int max_results = std::stoi(argv[3]);

    curl_global_init(CURL_GLOBAL_DEFAULT);

    std::cout << "Searching YouTube for: \"" << query << "\"...\n";
    std::vector<std::string> ids = search_videos(api_key, query, max_results);
    std::cout << "Found " << ids.size() << " video IDs.\n";

    std::cout << "Fetching full details for those videos...\n";
    std::vector<VideoRecord> records = get_video_details(api_key, ids);
    std::cout << "Retrieved details for " << records.size() << " videos.\n";

    // Write everything to CSV so it can be loaded into a database or
    // spreadsheet for your manual tagging pass (style, tone, themes).
    std::ofstream out("standup_videos.csv");
    out << "video_id,title,channel_title,thumbnail_url,duration,published_at,"
           "view_count,like_count,style_tags,tone_tags,theme_tags\n";

    for (auto& r : records) {
        out << csv_escape(r.video_id) << ","
            << csv_escape(r.title) << ","
            << csv_escape(r.channel_title) << ","
            << csv_escape(r.thumbnail_url) << ","
            << csv_escape(r.duration) << ","
            << csv_escape(r.published_at) << ","
            << r.view_count << ","
            << r.like_count << ","
            << "\"\",\"\",\"\"\n";  // empty tag columns for you to fill in manually
    }
    out.close();

    std::cout << "\nDone. Data written to standup_videos.csv\n";
    std::cout << "The last three columns (style_tags, tone_tags, theme_tags) are\n";
    std::cout << "left empty for your manual tagging pass.\n";

    curl_global_cleanup();
    return 0;
}