#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <map>
#include <set>
#include <algorithm>
#include <curl/curl.h>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

// Strip hidden \r, \n, spaces, and quotes (Crucial for Mac/Windows cross-compatibility)
std::string trim(const std::string& str) {
    size_t first = str.find_first_not_of(" \t\r\n\"");
    if (first == std::string::npos) return "";
    size_t last = str.find_last_not_of(" \t\r\n\"");
    return str.substr(first, (last - first + 1));
}

// Safely read lines, handling Apple Numbers \r carriage returns
std::istream& safe_getline(std::istream& is, std::string& t) {
    t.clear();
    std::istream::sentry se(is, true);
    std::streambuf* sb = is.rdbuf();
    for (;;) {
        int c = sb->sbumpc();
        if (c == EOF) {
            if (t.empty()) is.setstate(std::ios::eofbit);
            return is;
        }
        if (c == '\n') return is;
        if (c == '\r') {
            if (sb->sgetc() == '\n') sb->sbumpc();
            return is;
        }
        t += (char)c;
    }
}

static size_t write_callback(void* contents, size_t size, size_t nmemb, std::string* out) {
    size_t total_size = size * nmemb;
    out->append(static_cast<char*>(contents), total_size);
    return total_size;
}

std::string http_get(const std::string& url) {
    CURL* curl = curl_easy_init();
    std::string response;
    if (curl) {
        curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
        curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 1L);
        curl_easy_perform(curl);
        curl_easy_cleanup(curl);
    }
    return response;
}

std::string to_lower(const std::string& s) {
    std::string r = s;
    std::transform(r.begin(), r.end(), r.begin(), ::tolower);
    return r;
}

std::vector<std::string> parse_csv_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool in_quotes = false;
    for (size_t i = 0; i < line.size(); ++i) {
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

int find_col(const std::vector<std::string>& header, const std::string& needle) {
    for (size_t i = 0; i < header.size(); ++i) {
        if (to_lower(header[i]).find(needle) != std::string::npos) return (int)i;
    }
    return -1;
}

// -----------------------------------------------------------------
// CORE LOGIC 
// -----------------------------------------------------------------
int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Usage:\n";
        std::cout << "  Prepare: ./verify_and_filter prepare API_KEY master_videos.csv video_channel_map.csv channels_review.csv\n";
        std::cout << "  Apply:   ./verify_and_filter apply master_videos.csv video_channel_map.csv channels_review.csv MIN_VIEWS MIN_LIKES MIN_COMMENTS filtered_videos.csv\n";
        return 1;
    }

    std::string mode = argv[1];
    curl_global_init(CURL_GLOBAL_DEFAULT);

    if (mode == "apply") {
        if (argc < 9) {
            std::cout << "Error: Insufficient arguments for apply mode.\n";
            return 1;
        }

        std::string input_master = argv[2];
        std::string input_map = argv[3];
        std::string input_channels = argv[4];
        long long min_views = std::stoll(argv[5]);
        long long min_likes = std::stoll(argv[6]);
        long long min_comments = std::stoll(argv[7]);
        std::string output_filtered = argv[8];

        std::ifstream ch_file(input_channels);
        if (!ch_file.is_open()) {
            std::cout << "Error: Cannot open " << input_channels << "\n";
            return 1;
        }

        std::map<std::string, bool> approved_channels;
        std::string line;
        
        int id_col = -1;
        int approved_col = -1;

        // SMART HEADER HUNTER: Keep reading lines until we find the actual headers
        while (safe_getline(ch_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> header_fields = parse_csv_line(line);
            
            id_col = find_col(header_fields, "channel_id");
            approved_col = find_col(header_fields, "official");
            
            if (id_col != -1 && approved_col != -1) {
                break; // We found the real header row! Break out of the loop.
            }
        }

        if (id_col == -1 || approved_col == -1) {
            std::cout << "ERROR: Could not find 'channel_id' or 'official' headers in " << input_channels << "\n";
            return 1;
        }

        int loaded_approved = 0;

        // Now read the actual data rows
        while (safe_getline(ch_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> fields = parse_csv_line(line);
            if ((int)fields.size() > approved_col) {
                std::string ch_id = trim(fields[id_col]);
                std::string status = to_lower(trim(fields[approved_col]));
                bool is_approved = (status == "true" || status == "1" || status == "yes");
                
                approved_channels[ch_id] = is_approved;
                if (is_approved) loaded_approved++;
            }
        }
        ch_file.close();

        std::cout << "Loaded " << loaded_approved << " approved channels from " << input_channels << ".\n";

        if (loaded_approved == 0) {
            std::cout << "ERROR: Still reading 0 approved channels. Ensure TRUE is in your sheet and saved.\n";
            return 1;
        }

        std::ifstream map_file(input_map);
        if (!map_file.is_open()) {
            std::cout << "Error: Cannot open " << input_map << "\n";
            return 1;
        }

        std::map<std::string, std::string> video_channel_id;
        std::map<std::string, long long> video_comments;
        
        // Map file Smart Header Hunter
        int map_vid_col = -1, map_ch_col = -1, map_com_col = -1;
        while (safe_getline(map_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> m_header = parse_csv_line(line);
            map_vid_col = find_col(m_header, "video_id");
            map_ch_col = find_col(m_header, "channel_id");
            map_com_col = find_col(m_header, "comment");
            if (map_vid_col != -1) break;
        }

        while (safe_getline(map_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> fields = parse_csv_line(line);
            if ((int)fields.size() > std::max({map_vid_col, map_ch_col, map_com_col})) {
                std::string v_id = trim(fields[map_vid_col]);
                std::string ch_id = trim(fields[map_ch_col]);
                long long comments = trim(fields[map_com_col]).empty() ? 0 : std::stoll(trim(fields[map_com_col]));
                video_channel_id[v_id] = ch_id;
                video_comments[v_id] = comments;
            }
        }
        map_file.close();

        std::ifstream master_file(input_master);
        if (!master_file.is_open()) {
            std::cout << "Error: Cannot open " << input_master << "\n";
            return 1;
        }

        std::ofstream out_file(output_filtered);
        
        // Master file Smart Header Hunter
        int v_col = -1, view_col = -1, like_col = -1;
        while (safe_getline(master_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> m_header = parse_csv_line(line);
            v_col = find_col(m_header, "video_id");
            view_col = find_col(m_header, "view");
            like_col = find_col(m_header, "like");
            
            if (v_col != -1) {
                out_file << line << "\n"; // Write the real header to output
                break;
            }
        }

        int total_examined = 0, total_kept = 0, dropped_channel = 0, dropped_engagement = 0;

        while (safe_getline(master_file, line)) {
            if (line.empty()) continue;
            std::vector<std::string> fields = parse_csv_line(line);
            if ((int)fields.size() <= std::max(view_col, like_col)) continue;

            total_examined++;
            std::string v_id = trim(fields[v_col]);
            long long views = trim(fields[view_col]).empty() ? 0 : std::stoll(trim(fields[view_col]));
            long long likes = trim(fields[like_col]).empty() ? 0 : std::stoll(trim(fields[like_col]));
            long long comments = video_comments[v_id];
            std::string ch_id = video_channel_id[v_id];

            if (!approved_channels[ch_id]) {
                dropped_channel++;
                continue;
            }

            if (views < min_views || likes < min_likes || comments < min_comments) {
                dropped_engagement++;
                continue;
            }

            out_file << line << "\n";
            total_kept++;
        }

        master_file.close();
        out_file.close();

        std::cout << "\n================ FILTERING SUMMARY ================\n";
        std::cout << "Total Videos Examined:         " << total_examined << "\n";
        std::cout << "Dropped (Unofficial Channel):  " << dropped_channel << "\n";
        std::cout << "Dropped (Below Engagement):   " << dropped_engagement << "\n";
        std::cout << "---------------------------------------------------\n";
        std::cout << "HIGH-QUALITY VIDEOS RETAINED:  " << total_kept << "\n";
        std::cout << "Output saved to:               " << output_filtered << "\n";
    }

    curl_global_cleanup();
    return 0;
}