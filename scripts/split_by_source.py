#!/usr/bin/env python3
"""
Split JSONL file by source_file field
"""
import json
import os
from pathlib import Path
from collections import defaultdict

def split_jsonl_by_source(input_file, output_dir):
    """
    Split a JSONL file by source_file field.
    Each unique source_file will have its own output file.
    """
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Dictionary to store file handles
    file_handles = {}
    stats = defaultdict(int)
    
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                try:
                    data = json.loads(line.strip())
                    source_file = data.get('source_file', 'unknown')
                    
                    # Create output file if not exists
                    if source_file not in file_handles:
                        output_file = os.path.join(output_dir, f"{source_file.replace('.pdf', '')}.jsonl")
                        file_handles[source_file] = open(output_file, 'w', encoding='utf-8')
                        print(f"Created output file: {output_file}")
                    
                    # Write to corresponding file
                    file_handles[source_file].write(json.dumps(data, ensure_ascii=False) + '\n')
                    stats[source_file] += 1
                    
                except json.JSONDecodeError as e:
                    print(f"Error parsing JSON at line {line_num}: {e}")
                    continue
    
    finally:
        # Close all file handles
        for f in file_handles.values():
            f.close()
    
    # Print statistics
    print("\n" + "="*50)
    print("Split Summary:")
    print("="*50)
    for source_file in sorted(stats.keys()):
        output_file = f"{source_file.replace('.pdf', '')}.jsonl"
        print(f"{source_file:15} -> {output_file:20} ({stats[source_file]:4} records)")
    
    print("="*50)
    print(f"Total records: {sum(stats.values())}")
    print(f"Total files created: {len(stats)}")

if __name__ == "__main__":
    input_file = "/workspaces/Vet_DUR/backend/data/plumb_data_temp/plumbs_structured_db.jsonl"
    output_dir = "/workspaces/Vet_DUR/backend/data/plumb_data_temp/split_by_source"
    
    print(f"Splitting {input_file}")
    print(f"Output directory: {output_dir}\n")
    
    split_jsonl_by_source(input_file, output_dir)
    
    print("\n✓ Split completed successfully!")
