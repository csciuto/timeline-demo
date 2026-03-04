import json
import os
import requests
from urllib.parse import urlparse, unquote

def download_image(url, filepath):
    """Downloads an image from a URL to a specified filepath."""
    try:
        # Check if it's actually a web URL
        parsed_url = urlparse(url)
        if not all([parsed_url.scheme, parsed_url.netloc]):
            print(f"Skipping non-URL or local path: {url}")
            return False

        # Ensure the directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Check if file already exists
        if os.path.exists(filepath):
            print(f"Skipping existing file: {filepath}")
            return True

        # Download the image
        print(f"Downloading {url} to {filepath}...")
        response = requests.get(url, stream=True, headers={'User-Agent': 'TimelineImageDownloader/1.0'})
        response.raise_for_status() # Raise an exception for bad status codes

        with open(filepath, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"Successfully downloaded {filepath}")
        return True
    except requests.exceptions.RequestException as e:
        print(f"Error downloading {url}: {e}")
        return False
    except OSError as e:
        print(f"Error saving file {filepath}: {e}")
        return False
    except Exception as e:
        print(f"An unexpected error occurred for {url}: {e}")
        return False

def process_data_file(json_filepath):
    """Reads the JSON data file, downloads images, and updates the file."""
    try:
        with open(json_filepath, 'r') as f:
            data = json.load(f)
            # Use a deep copy method that handles JSON structure well
            import copy
            updated_data = copy.deepcopy(data)
    except FileNotFoundError:
        print(f"Error: Data file not found at {json_filepath}")
        return
    except json.JSONDecodeError:
        print(f"Error: Could not decode JSON from {json_filepath}")
        return
    except Exception as e: # Catch potential deepcopy errors too
        print(f"Error processing data file: {e}")
        return

    total_items = 0
    downloaded_count = 0
    skipped_count = 0
    error_count = 0
    updated_paths_count = 0
    data_changed = False

    for year, items in data.items():
        # Ensure the key exists in updated_data, especially if original file was empty/malformed
        if year not in updated_data:
            updated_data[year] = []

        for index, item in enumerate(items):
            # Ensure the index exists, sanity check
            if index >= len(updated_data[year]):
                print(f"Warning: Index mismatch for year {year}, item {index}. Skipping.")
                continue

            total_items += 1
            photo_url_or_path = item.get('photo')

            if not photo_url_or_path:
                # print(f"Skipping item with no photo entry (Year: {year}, Caption: {item.get('caption', 'N/A')})")
                skipped_count += 1
                continue

            if 'placeholder' in photo_url_or_path.lower() or photo_url_or_path.startswith('images/'):
                # print(f"Skipping placeholder/local path: {photo_url_or_path}")
                skipped_count += 1
                continue

            parsed_url = urlparse(photo_url_or_path)
            if all([parsed_url.scheme, parsed_url.netloc]):
                # *** Decode the filename ***
                filename_encoded = os.path.basename(parsed_url.path)
                filename_decoded = unquote(filename_encoded)

                if not filename_decoded: # Handle cases where path ends with / or is empty after decode
                    caption_slug = item.get('caption', f'image_{total_items}').lower()
                    # Basic slugify
                    caption_slug = ''.join(c if c.isalnum() else '_' for c in caption_slug).strip('_')
                    # Basic extension guess
                    if 'jpg' in photo_url_or_path.lower() or 'jpeg' in photo_url_or_path.lower():
                        filename_decoded = f"{caption_slug}.jpg"
                    elif 'png' in photo_url_or_path.lower():
                         filename_decoded = f"{caption_slug}.png"
                    elif 'gif' in photo_url_or_path.lower():
                         filename_decoded = f"{caption_slug}.gif"
                    else:
                         filename_decoded = f"{caption_slug}.img" # Fallback
                    print(f"Generated filename for URL {photo_url_or_path}: {filename_decoded}")


                # Construct local filepath with DECODED name
                local_filepath = os.path.join('images', str(year), filename_decoded)

                # Attempt download
                if download_image(photo_url_or_path, local_filepath):
                    downloaded_count += 1
                    # *** Update the path in the data structure with the DECODED path ***
                    relative_local_path = os.path.join('images', str(year), filename_decoded).replace(os.sep, '/')
                    # Check against the potentially already updated entry in updated_data
                    if updated_data[year][index]['photo'] != relative_local_path:
                        print(f"Updating JSON path for {year} item {index} from {updated_data[year][index]['photo']} to {relative_local_path}")
                        updated_data[year][index]['photo'] = relative_local_path
                        updated_paths_count += 1
                        data_changed = True
                else:
                    error_count += 1
            else:
                # print(f"Skipping non-URL path: {photo_url_or_path}")
                skipped_count += 1

    # Write updated data back to JSON file only if changes were made
    if data_changed:
        try:
            with open(json_filepath, 'w') as f:
                json.dump(updated_data, f, indent=2) # Write with indentation
            print(f"\nSuccessfully updated {json_filepath} with {updated_paths_count} new local image paths.")
        except OSError as e:
            print(f"\nError writing updated data to {json_filepath}: {e}")
    else:
        print("\nNo changes to image paths in data.json were needed.")

    print("\n--- Download Summary ---")
    print(f"Total items processed: {total_items}")
    print(f"Images downloaded/verified: {downloaded_count}")
    print(f"JSON paths updated: {updated_paths_count}")
    print(f"Placeholders/Local/Skipped: {skipped_count}")
    print(f"Download errors: {error_count}")

if __name__ == "__main__":
    data_file = 'data.json'
    process_data_file(data_file) 