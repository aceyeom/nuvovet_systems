#!/usr/bin/env python3
"""
Split JSONL files by batch size (default 20 records per file)
"""
import json
import os
from pathlib import Path
from collections import defaultdict

def split_by_batch(input_dir, output_dir, batch_size=20):
    """
    Split JSONL files by batch size.
    Each batch will be saved as a separate file with _part suffix.
    """
    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    stats = defaultdict(int)
    total_files_created = 0
    
    # Process all JSONL files in input directory
    jsonl_files = sorted([f for f in os.listdir(input_dir) if f.endswith('.jsonl')])
    
    print(f"Processing {len(jsonl_files)} files from {input_dir}\n")
    print("="*60)
    
    for jsonl_file in jsonl_files:
        input_path = os.path.join(input_dir, jsonl_file)
        base_name = jsonl_file.replace('.jsonl', '')
        
        records = []
        with open(input_path, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    record = json.loads(line.strip())
                    records.append(record)
                except json.JSONDecodeError:
                    continue
        
        # Split into batches
        num_batches = (len(records) + batch_size - 1) // batch_size
        
        for batch_idx in range(num_batches):
            start_idx = batch_idx * batch_size
            end_idx = min(start_idx + batch_size, len(records))
            batch_records = records[start_idx:end_idx]
            
            # Create output file
            if num_batches == 1:
                output_file = os.path.join(output_dir, f"{base_name}.jsonl")
            else:
                output_file = os.path.join(output_dir, f"{base_name}_part{batch_idx + 1}.jsonl")
            
            # Write batch to file
            with open(output_file, 'w', encoding='utf-8') as f:
                for record in batch_records:
                    f.write(json.dumps(record, ensure_ascii=False) + '\n')
            
            stats[jsonl_file] += len(batch_records)
            total_files_created += 1
        
        # Print status for this file
        if num_batches == 1:
            print(f"{jsonl_file:15} -> {base_name}.jsonl ({len(records)} records)")
        else:
            print(f"{jsonl_file:15} -> {num_batches} files")
            for batch_idx in range(num_batches):
                start_idx = batch_idx * batch_size
                end_idx = min(start_idx + batch_size, len(records))
                batch_count = end_idx - start_idx
                print(f"                   └─ {base_name}_part{batch_idx + 1}.jsonl ({batch_count} records)")
    
    print("="*60)
    print(f"\nTotal records processed: {sum(stats.values())}")
    print(f"Total files created: {total_files_created}")
    print(f"Batch size: {batch_size} records")

if __name__ == "__main__":
    input_dir = "/workspaces/Vet_DUR/backend/data/plumb_data_temp/split_by_source"
    output_dir = "/workspaces/Vet_DUR/backend/data/plumb_data_temp/split_by_batch_20"
    batch_size = 20
    
    print(f"Splitting JSONL files by batch size ({batch_size} records)\n")
    print(f"Input directory:  {input_dir}")
    print(f"Output directory: {output_dir}\n")
    
    split_by_batch(input_dir, output_dir, batch_size)
    
    print("\n✓ Batch split completed successfully!")
