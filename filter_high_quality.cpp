#include <iostream>
#include <fstream>
#include <sstream>
#include <vector>
#include <string>
#include <algorithm>

// Convert string to lowercase
std::string to_lower(const std::string& input) {
    std::string result = input;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

// Parse a single CSV line with quote handling
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

int main() {
    std::string input_filename = "cleaned_master_videos.csv";
    std::string output_filename = "high_quality_specials.csv";

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

    std::string header_line;
    std::getline(input_file, header_line);
    
    // Keep header identical
    output_file << header_line << "\n";

    std::string line;
    int total_processed = 0;
    int total_kept = 0;
    int removed_low_views = 0;
    int removed_short_duration = 0;
    int removed_junk_types = 0;

    while (std::getline(input_file, line)) {
        if (line.empty()) continue;

        std::vector<std::string> row = parse_csv_line(line);
        if (row.size() < 10) continue;

        total_processed++;

        std::string video_id = row[0];
        std::string comedian_name = row[1];
        std::string title = row[2];
        std::string content_type = row[3];
        long long view_count = std::stoll(row[4].empty() ? "0" : row[4]);
        long long like_count = std::stoll(row[5].empty() ? "0" : row[5]);
        int duration_seconds = std::stoi(row[6].empty() ? "0" : row[6]);
        std::string is_duplicate = row[9];

        std::string title_lower = to_lower(title);

        // Filter 1: Discard duplicates flagged previously
        if (is_duplicate == "true") {
            continue;
        }

        // Filter 2: Discard reaction, podcast, review, or interview content
        if (content_type == "reaction" || content_type == "podcast_appearance" ||
            title_lower.find("react") != std::string::npos || 
            title_lower.find("interview") != std::string::npos ||
            title_lower.find("review") != std::string::npos) {
            removed_junk_types++;
            continue;
        }

        // Filter 3: Duration check for full specials (Must be at least 25 minutes = 1500s)
        if (content_type == "full_special" && duration_seconds < 1500) {
            removed_short_duration++;
            continue;
        }

        // Filter 4: View Count Sanity Check (Must have at least 500,000 views)
        if (view_count < 500000) {
            removed_low_views++;
            continue;
        }

        // If it passes all strict filters, write to the high quality dataset
        output_file << line << "\n";
        total_kept++;
    }

    input_file.close();
    output_file.close();

    std::cout << "--- QUALITY FILTERING RESULTS ---" << std::endl;
    std::cout << "Total Videos Examined: " << total_processed << std::endl;
    std::cout << "Removed (Low Views < 500k): " << removed_low_views << std::endl;
    std::cout << "Removed (Short Duration < 25m): " << removed_short_duration << std::endl;
    std::cout << "Removed (Reaction/Junk Content): " << removed_junk_types << std::endl;
    std::cout << "---------------------------------" << std::endl;
    std::cout << "HIGH QUALITY VIDEOS RETAINED: " << total_kept << std::endl;
    std::cout << "Saved clean file to: " << output_filename << std::endl;

    return 0;
}