#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <algorithm>
#include <map>
#include <set>

// Function to convert string to lowercase
std::string to_lower(const std::string& input) {
    std::string result = input;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

// Function to parse a single CSV line with quote handling
std::vector<std::string> parse_csv_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string field = "";
    bool in_quotes = false;

    for (size_t i = 0; i < line.length(); ++i) {
        char c = line[i];
        if (c == '"') {
            in_quotes = !in_quotes;
        } else if (c == ',' && !in_quotes) {
            fields.push_back(field);
            field = "";
        } else {
            field += c;
        }
    }
    fields.push_back(field);
    return fields;
}

// Function to escape commas for CSV output
std::string escape_csv_field(const std::string& field) {
    if (field.find(',') != std::string::npos || field.find('"') != std::string::npos) {
        std::string escaped = "\"";
        for (char c : field) {
            if (c == '"') escaped += "\"\"";
            else escaped += c;
        }
        escaped += "\"";
        return escaped;
    }
    return field;
}

int main() {
    std::string input_filename = "master_videos.csv";
    std::string output_filename = "cleaned_master_videos.csv";

    std::ifstream input_file(input_filename);
    if (!input_file.is_open()) {
        std::cout << "Error: Could not open " << input_filename << std::endl;
        return 1;
    }

    std::ofstream output_file(output_filename);
    if (!output_file.is_open()) {
        std::cout << "Error: Could not create " << output_filename << std::endl;
        return 1;
    }

    // List of known comedians to match against title text
    std::vector<std::string> known_comedians = {
        "Zakir Khan", "Abhishek Upmanyu", "Samay Raina", "Anubhav Singh Bassi",
        "Aakash Gupta", "Munawar Faruqui", "Rahul Subramanian", "Harsh Gujral",
        "Jaspreet Singh", "Kanan Gill", "Biswa Kalyan Rath", "Gaurav Kapoor",
        "Pranit More", "Inder Sahani", "Devesh Dixit", "Amit Tandon",
        "Madhur Virli", "Chirag Panjwani", "Shubham Pujari", "Shashi Dhiman",
        "Naman Jain", "Dave Chappelle", "Matt Rife", "Gary Owen", "Jimmy Carr",
        "Trevor Wallace", "Lucas Zelnick", "Gianmarco Soresi", "Nate Jackson",
        "Jeff Arcuri", "Matt Rife", "Chris D'Elia", "Max Amini", "Phil Hanley"
    };

    std::string header_line;
    std::getline(input_file, header_line);
    
    // Write new CSV header including comedian_name and content_type
    output_file << "video_id,comedian_name,title,content_type,view_count,like_count,duration_seconds,published_at,thumbnail_url,is_duplicate\n";

    std::string line;
    int total_processed = 0;
    int duplicates_flagged = 0;

    // Map to track duplicate titles and durations
    std::map<std::string, int> title_duration_tracker;

    while (std::getline(input_file, line)) {
        if (line.empty()) continue;

        std::vector<std::string> row = parse_csv_line(line);
        if (row.size() < 8) continue;

        // Extracting columns based on standard master_videos schema
        std::string raw_comedian = row[0];
        std::string video_id = row[1];
        std::string title = row[2];
        std::string view_count = row[3];
        std::string like_count = row[4];
        std::string duration_seconds = row[5];
        std::string published_at = row[6];
        std::string thumbnail_url = row[7];

        std::string title_lower = to_lower(title);

        // 1. Determine Content Type
        std::string content_type = "other";
        if (title_lower.find("reaction") != std::string::npos || title_lower.find("reacts") != std::string::npos || title_lower.find("reacting") != std::string::npos) {
            content_type = "reaction";
        } else if (title_lower.find("podcast") != std::string::npos || title_lower.find("kapil sharma") != std::string::npos || title_lower.find("podcast") != std::string::npos || title_lower.find("talk show") != std::string::npos || title_lower.find("trs ") != std::string::npos || title_lower.find("ranveer") != std::string::npos) {
            content_type = "podcast_appearance";
        } else if (title_lower.find("compilation") != std::string::npos || title_lower.find("best of") != std::string::npos || title_lower.find("moments") != std::string::npos || title_lower.find("highlights") != std::string::npos) {
            content_type = "compilation";
        } else if (title_lower.find("crowd work") != std::string::npos || title_lower.find("crowdwork") != std::string::npos) {
            content_type = "crowd_work_clip";
        } else if (title_lower.find("full special") != std::string::npos || title_lower.find("standup comedy special") != std::string::npos || title_lower.find("stand up comedy special") != std::string::npos || title_lower.find("special") != std::string::npos) {
            content_type = "full_special";
        } else {
            content_type = "full_special"; // Default fallback for standup channels
        }

        // 2. Determine Real Comedian Name
        std::string real_comedian = raw_comedian; // fallback to channel name
        for (const std::string& comedian : known_comedians) {
            if (title_lower.find(to_lower(comedian)) != std::string::npos) {
                real_comedian = comedian;
                break;
            }
        }

        // 3. Deduplication Check (Normalized title + duration)
        std::string normalized_key = title_lower.substr(0, 20) + "_" + duration_seconds;
        bool is_duplicate = false;
        if (title_duration_tracker.find(normalized_key) != title_duration_tracker.end()) {
            is_duplicate = true;
            duplicates_flagged++;
        } else {
            title_duration_tracker[normalized_key] = 1;
        }

        std::string duplicate_str = is_duplicate ? "true" : "false";

        // Write row to cleaned output file
        output_file << escape_csv_field(video_id) << ","
                    << escape_csv_field(real_comedian) << ","
                    << escape_csv_field(title) << ","
                    << escape_csv_field(content_type) << ","
                    << escape_csv_field(view_count) << ","
                    << escape_csv_field(like_count) << ","
                    << escape_csv_field(duration_seconds) << ","
                    << escape_csv_field(published_at) << ","
                    << escape_csv_field(thumbnail_url) << ","
                    << duplicate_str << "\n";

        total_processed++;
    }

    input_file.close();
    output_file.close();

    std::cout << "Successfully cleaned " << total_processed << " videos." << std::endl;
    std::cout << "Flagged " << duplicates_flagged << " reuploaded duplicates." << std::endl;
    std::cout << "Cleaned data written to " << output_filename << std::endl;

    return 0;
}