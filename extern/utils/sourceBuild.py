import glob
import hashlib

BLOCKSIZE = 65536

def hash_file(file_path: str):
  shash = hashlib.sha256()
  with open(file_path, 'rb') as f:
    buf = f.read(BLOCKSIZE)
    while len(buf) > 0:
      shash.update(buf)
      buf = f.read(BLOCKSIZE)
  return shash.hexdigest()

def hash_all_files():
  with open('output.source', 'w') as outfile:
    for filename in glob.glob('./**/*.zip'):
      shash = hash_file(filename)
      outfile.write(shash.upper() + '\n')
      outfile.write(filename[2:] + '\n')
    

hash_all_files()