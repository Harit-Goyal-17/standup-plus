// import_to_db.cpp
//
// Takes the CSV produced by fetch_standup_data.cpp and loads it into a
// proper relational SQLite database: comedians, videos, tags, video_tags.
//
// Safe to re-run any number of times, even after fetching more data with
// different search queries — videos are upserted by video_id, so nothing
// gets duplicated, and existing rows are simply updated with fresh stats.
//
// TAGGING WORKFLOW:
//   The style_tags/tone_tags/theme_tags columns in the CSV can be filled
//   in with semicolon-separated values, e.g.:
//     style_tags = "observational;storytelling"
//     tone_tags  = "dark;self-deprecating"
//     theme_tags = "relationships;family"
//   Re-run this importer after filling those in, and it will populate the
//   tags/video_tags tables automatically. Leave them blank if you haven't
//   tagged a video yet — you can tag incrementally over time.
//
// BUILD:
//   g++ -std=c++17 import_to_db.cpp -o import_to_db -lsqlite3
//
// RUN:
//   ./import_to_db standup_videos.csv standup.db

#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <sqlite3.h>

// ---- CSV parsing ----------------------------------------------------
// Handles quoted fields (which may contain commas) the way the fetcher's
// csv_escape() writes them, e.g.  "Some, Title","Channel",...
std::vector<std::string> parse_csv_line(const std::string& line) {
    std::vector<std::string> fields;
    std::string field;
    bool in_quotes = false;

    for (size_t i = 0; i < line.size(); ++i) {
        char c = line[i];
        if (in_quotes) {
            if (c == '"') {
                if (i + 1 < line.size() && line[i + 1] == '"') {
                    field += '"'; // escaped quote
                    ++i;
                } else {
                    in_quotes = false;
                }
            } else {
                field += c;
            }
        } else {
            if (c == '"') {
                in_quotes = true;
            } else if (c == ',') {
                fields.push_back(field);
                field.clear();
            } else {
                field += c;
            }
        }
    }
    fields.push_back(field);
    return fields;
}

// Splits a semicolon-separated tag string like "dark;self-deprecating"
// into individual trimmed tag strings. Empty input -> empty vector.
std::vector<std::string> split_tags(const std::string& raw) {
    std::vector<std::string> tags;
    std::stringstream ss(raw);
    std::string item;
    while (std::getline(ss, item, ';')) {
        // trim whitespace
        size_t start = item.find_first_not_of(" \t");
        size_t end = item.find_last_not_of(" \t");
        if (start != std::string::npos) {
            tags.push_back(item.substr(start, end - start + 1));
        }
    }
    return tags;
}

// Converts ISO 8601 duration (PT1H43M53S, PT54M54S, PT38M52S, etc.)
// into total seconds, since raw ISO text is useless as an ML feature.
long long parse_duration_seconds(const std::string& iso) {
    long long hours = 0, minutes = 0, seconds = 0;
    long long value = 0;
    bool in_time_part = false;

    for (char c : iso) {
        if (c == 'P') continue;
        if (c == 'T') { in_time_part = true; continue; }
        if (isdigit(c)) {
            value = value * 10 + (c - '0');
        } else if (c == 'H') {
            hours = value; value = 0;
        } else if (c == 'M' && in_time_part) {
            minutes = value; value = 0;
        } else if (c == 'S') {
            seconds = value; value = 0;
        }
    }
    return hours * 3600 + minutes * 60 + seconds;
}

// Runs a SQL statement with no parameters (used for schema setup).
void exec_sql(sqlite3* db, const std::string& sql) {
    char* err_msg = nullptr;
    if (sqlite3_exec(db, sql.c_str(), nullptr, nullptr, &err_msg) != SQLITE_OK) {
        std::cerr << "SQL error: " << err_msg << "\nStatement: " << sql << std::endl;
        sqlite3_free(err_msg);
    }
}

void create_schema(sqlite3* db) {
    exec_sql(db, R"(
        CREATE TABLE IF NOT EXISTS comedians (
            comedian_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        );
    )");

    exec_sql(db, R"(
        CREATE TABLE IF NOT EXISTS videos (
            video_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            comedian_id INTEGER,
            thumbnail_url TEXT,
            duration_seconds INTEGER,
            published_at TEXT,
            view_count INTEGER,
            like_count INTEGER,
            FOREIGN KEY (comedian_id) REFERENCES comedians(comedian_id)
        );
    )");

    exec_sql(db, R"(
        CREATE TABLE IF NOT EXISTS tags (
            tag_id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_name TEXT NOT NULL,
            tag_type TEXT NOT NULL CHECK (tag_type IN ('style','tone','theme')),
            UNIQUE(tag_name, tag_type)
        );
    )");

    exec_sql(db, R"(
        CREATE TABLE IF NOT EXISTS video_tags (
            video_id TEXT NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (video_id, tag_id),
            FOREIGN KEY (video_id) REFERENCES videos(video_id),
            FOREIGN KEY (tag_id) REFERENCES tags(tag_id)
        );
    )");
}

// Returns the comedian_id for a name, inserting the comedian if new.
int upsert_comedian(sqlite3* db, const std::string& name) {
    sqlite3_stmt* stmt;

    sqlite3_prepare_v2(db, "INSERT OR IGNORE INTO comedians (name) VALUES (?);", -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    sqlite3_prepare_v2(db, "SELECT comedian_id FROM comedians WHERE name = ?;", -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_TRANSIENT);
    int id = -1;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        id = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);
    return id;
}

// Returns the tag_id for a (name, type) pair, inserting it if new.
int upsert_tag(sqlite3* db, const std::string& name, const std::string& type) {
    sqlite3_stmt* stmt;

    sqlite3_prepare_v2(db, "INSERT OR IGNORE INTO tags (tag_name, tag_type) VALUES (?, ?);", -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, type.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);

    sqlite3_prepare_v2(db, "SELECT tag_id FROM tags WHERE tag_name = ? AND tag_type = ?;", -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, name.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_text(stmt, 2, type.c_str(), -1, SQLITE_TRANSIENT);
    int id = -1;
    if (sqlite3_step(stmt) == SQLITE_ROW) {
        id = sqlite3_column_int(stmt, 0);
    }
    sqlite3_finalize(stmt);
    return id;
}

void link_video_tag(sqlite3* db, const std::string& video_id, int tag_id) {
    sqlite3_stmt* stmt;
    sqlite3_prepare_v2(db, "INSERT OR IGNORE INTO video_tags (video_id, tag_id) VALUES (?, ?);", -1, &stmt, nullptr);
    sqlite3_bind_text(stmt, 1, video_id.c_str(), -1, SQLITE_TRANSIENT);
    sqlite3_bind_int(stmt, 2, tag_id);
    sqlite3_step(stmt);
    sqlite3_finalize(stmt);
}

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "Usage: " << argv[0] << " <input_csv> <output_db>\n";
        return 1;
    }

    std::string csv_path = argv[1];
    std::string db_path = argv[2];

    std::ifstream file(csv_path);
    if (!file.is_open()) {
        std::cerr << "Could not open CSV file: " << csv_path << std::endl;
        return 1;
    }

    sqlite3* db;
    if (sqlite3_open(db_path.c_str(), &db) != SQLITE_OK) {
        std::cerr << "Could not open database: " << sqlite3_errmsg(db) << std::endl;
        return 1;
    }
    create_schema(db);

    std::string line;
    std::getline(file, line); // skip header row

    int row_count = 0;
    exec_sql(db, "BEGIN TRANSACTION;"); // batch all inserts for speed

    while (std::getline(file, line)) {
        if (line.empty()) continue;
        std::vector<std::string> f = parse_csv_line(line);
        if (f.size() < 11) continue; // malformed row safety check

        // Columns per fetch_standup_data.cpp's CSV header:
        // 0 video_id, 1 title, 2 channel_title, 3 thumbnail_url, 4 duration,
        // 5 published_at, 6 view_count, 7 like_count,
        // 8 style_tags, 9 tone_tags, 10 theme_tags
        std::string video_id      = f[0];
        std::string title         = f[1];
        std::string channel_title = f[2];
        std::string thumbnail_url = f[3];
        std::string duration_iso  = f[4];
        std::string published_at  = f[5];
        long long view_count      = f[6].empty() ? 0 : std::stoll(f[6]);
        long long like_count      = f[7].empty() ? 0 : std::stoll(f[7]);
        std::string style_tags    = f[8];
        std::string tone_tags     = f[9];
        std::string theme_tags    = f[10];

        int comedian_id = upsert_comedian(db, channel_title);
        long long duration_seconds = parse_duration_seconds(duration_iso);

        // Upsert the video: insert if new, update stats if it already exists.
        sqlite3_stmt* stmt;
        sqlite3_prepare_v2(db, R"(
            INSERT INTO videos (video_id, title, comedian_id, thumbnail_url,
                                 duration_seconds, published_at, view_count, like_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(video_id) DO UPDATE SET
                view_count = excluded.view_count,
                like_count = excluded.like_count;
        )", -1, &stmt, nullptr);
        sqlite3_bind_text(stmt, 1, video_id.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_text(stmt, 2, title.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int(stmt, 3, comedian_id);
        sqlite3_bind_text(stmt, 4, thumbnail_url.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, 5, duration_seconds);
        sqlite3_bind_text(stmt, 6, published_at.c_str(), -1, SQLITE_TRANSIENT);
        sqlite3_bind_int64(stmt, 7, view_count);
        sqlite3_bind_int64(stmt, 8, like_count);
        sqlite3_step(stmt);
        sqlite3_finalize(stmt);

        // Link any tags present in this row.
        for (auto& t : split_tags(style_tags)) link_video_tag(db, video_id, upsert_tag(db, t, "style"));
        for (auto& t : split_tags(tone_tags))  link_video_tag(db, video_id, upsert_tag(db, t, "tone"));
        for (auto& t : split_tags(theme_tags)) link_video_tag(db, video_id, upsert_tag(db, t, "theme"));

        ++row_count;
    }

    exec_sql(db, "COMMIT;");
    sqlite3_close(db);

    std::cout << "Imported/updated " << row_count << " videos into " << db_path << std::endl;
    return 0;
}