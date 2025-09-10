// Force clear all dependency calculator data from localStorage
console.log('Force clearing all dependency calculator data...');

// Clear all dependency-related localStorage keys
const keysToClear = [
  'dependency_residents_v1',
  'dependency_communities_v1', 
  'dependency_staff_actual_v1',
  'dependency_snapshots_v1'
];

let clearedCount = 0;
keysToClear.forEach(key => {
  if (localStorage.getItem(key)) {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`Cleared: ${key}`);
  }
});

// Also clear any other dependency-related keys
Object.keys(localStorage).forEach(key => {
  if (key.includes('dependency') || key.includes('Dependency')) {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`Cleared: ${key}`);
  }
});

console.log(`Total keys cleared: ${clearedCount}`);
console.log('All dependency calculator data has been cleared from localStorage.');
console.log('Now refresh your dependency calculator page to load fresh data from Firebase.');
