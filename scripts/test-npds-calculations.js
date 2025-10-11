#!/usr/bin/env node

/**
 * NPDS Calculation Test Script
 * 
 * This script validates the Northwick Park Dependency Score calculations
 * to ensure they match the authentic NPDS methodology.
 * 
 * Run: node scripts/test-npds-calculations.js
 */

// NPDS Scoring Function (copied from main implementation)
function calculateNDPSScore(resident) {
  const NPDS_FIELDS = [
    // BCN - 12 items
    'bcn_mobility', 'bcn_transfers', 'bcn_washing', 'bcn_dressing',
    'bcn_toileting', 'bcn_continence', 'bcn_feeding', 'bcn_turning',
    'bcn_getting_up', 'bcn_bed_mobility', 'bcn_walking', 'bcn_stairs',
    // SNN - 5 items
    'snn_breathing', 'snn_drugs', 'snn_skin_care', 'snn_treatment', 'snn_observation',
    // THERAPY - 3 items (organizational extension)
    'therapy_communication', 'therapy_cognitive', 'therapy_behaviour'
  ];

  let bcnScore = 0;
  let snnScore = 0;
  let therapyScore = 0;

  for (const field of NPDS_FIELDS) {
    const value = resident[field] || '0';
    const score = parseInt(value, 10) || 0;

    if (field.startsWith('bcn_')) {
      bcnScore += score;
    } else if (field.startsWith('snn_')) {
      snnScore += score;
    } else if (field.startsWith('therapy_')) {
      therapyScore += score;
    }
  }

  // Cap at maximums
  bcnScore = Math.min(bcnScore, 60); // 12 items × 5
  snnScore = Math.min(snnScore, 25); // 5 items × 5
  therapyScore = Math.min(therapyScore, 15); // 3 items × 5

  return bcnScore + snnScore + therapyScore;
}

// Band Calculation Function
function getNDPSBand(score) {
  if (score <= 20) return { band: 1, name: "Low Dependency" };
  if (score <= 40) return { band: 2, name: "Moderate Dependency" };
  if (score <= 60) return { band: 3, name: "High Dependency" };
  if (score <= 80) return { band: 4, name: "Very High Dependency" };
  return { band: 5, name: "Maximum Dependency" };
}

// Test Cases
const testCases = [
  {
    name: "Test 1: Fully Independent Resident",
    description: "All scores = 0 (completely independent)",
    resident: {
      name: "John Independent",
      bcn_mobility: '0', bcn_transfers: '0', bcn_washing: '0', bcn_dressing: '0',
      bcn_toileting: '0', bcn_continence: '0', bcn_feeding: '0', bcn_turning: '0',
      bcn_getting_up: '0', bcn_bed_mobility: '0', bcn_walking: '0', bcn_stairs: '0',
      snn_breathing: '0', snn_drugs: '0', snn_skin_care: '0', snn_treatment: '0', snn_observation: '0',
      therapy_communication: '0', therapy_cognitive: '0', therapy_behaviour: '0'
    },
    expectedScore: 0,
    expectedBand: 1,
    expectedRatio: "1:10 (day)"
  },
  {
    name: "Test 2: Low Dependency Resident",
    description: "Most scores = 1, some = 0 (minimal assistance)",
    resident: {
      name: "Jane Low",
      bcn_mobility: '1', bcn_transfers: '1', bcn_washing: '0', bcn_dressing: '1',
      bcn_toileting: '0', bcn_continence: '0', bcn_feeding: '0', bcn_turning: '0',
      bcn_getting_up: '1', bcn_bed_mobility: '0', bcn_walking: '1', bcn_stairs: '2',
      snn_breathing: '0', snn_drugs: '1', snn_skin_care: '0', snn_treatment: '0', snn_observation: '1',
      therapy_communication: '1', therapy_cognitive: '0', therapy_behaviour: '1'
    },
    expectedScore: 11, // 7 BCN + 2 SNN + 2 THERAPY
    expectedBand: 1,
    expectedRatio: "1:10 (day)"
  },
  {
    name: "Test 3: Moderate Dependency Resident",
    description: "Mix of 1s and 2s (regular assistance)",
    resident: {
      name: "Bob Moderate",
      bcn_mobility: '2', bcn_transfers: '2', bcn_washing: '2', bcn_dressing: '2',
      bcn_toileting: '1', bcn_continence: '1', bcn_feeding: '1', bcn_turning: '1',
      bcn_getting_up: '2', bcn_bed_mobility: '1', bcn_walking: '2', bcn_stairs: '2',
      snn_breathing: '0', snn_drugs: '2', snn_skin_care: '1', snn_treatment: '1', snn_observation: '1',
      therapy_communication: '2', therapy_cognitive: '1', therapy_behaviour: '2'
    },
    expectedScore: 29, // 19 BCN + 5 SNN + 5 THERAPY
    expectedBand: 2,
    expectedRatio: "1:6 (day)"
  },
  {
    name: "Test 4: High Dependency Resident",
    description: "Mix of 2s and 3s (extensive assistance)",
    resident: {
      name: "Carol High",
      bcn_mobility: '3', bcn_transfers: '3', bcn_washing: '3', bcn_dressing: '3',
      bcn_toileting: '3', bcn_continence: '2', bcn_feeding: '2', bcn_turning: '2',
      bcn_getting_up: '3', bcn_bed_mobility: '2', bcn_walking: '3', bcn_stairs: '4',
      snn_breathing: '2', snn_drugs: '3', snn_skin_care: '2', snn_treatment: '2', snn_observation: '2',
      therapy_communication: '3', therapy_cognitive: '2', therapy_behaviour: '3'
    },
    expectedScore: 52, // 33 BCN + 11 SNN + 8 THERAPY
    expectedBand: 3,
    expectedRatio: "1:4 (day)"
  },
  {
    name: "Test 5: Very High Dependency Resident",
    description: "Mix of 3s and 4s (very high assistance)",
    resident: {
      name: "David VeryHigh",
      bcn_mobility: '4', bcn_transfers: '4', bcn_washing: '4', bcn_dressing: '3',
      bcn_toileting: '3', bcn_continence: '3', bcn_feeding: '3', bcn_turning: '3',
      bcn_getting_up: '4', bcn_bed_mobility: '3', bcn_walking: '4', bcn_stairs: '5',
      snn_breathing: '3', snn_drugs: '4', snn_skin_care: '3', snn_treatment: '3', snn_observation: '3',
      therapy_communication: '4', therapy_cognitive: '3', therapy_behaviour: '4'
    },
    expectedScore: 70, // 43 BCN + 16 SNN + 11 THERAPY
    expectedBand: 4,
    expectedRatio: "1:2.5 (day)"
  },
  {
    name: "Test 6: Maximum Dependency Resident",
    description: "Most scores = 5 (totally dependent)",
    resident: {
      name: "Emma Maximum",
      bcn_mobility: '5', bcn_transfers: '5', bcn_washing: '5', bcn_dressing: '5',
      bcn_toileting: '5', bcn_continence: '4', bcn_feeding: '4', bcn_turning: '4',
      bcn_getting_up: '5', bcn_bed_mobility: '4', bcn_walking: '5', bcn_stairs: '5',
      snn_breathing: '5', snn_drugs: '5', snn_skin_care: '4', snn_treatment: '5', snn_observation: '4',
      therapy_communication: '5', therapy_cognitive: '4', therapy_behaviour: '5'
    },
    expectedScore: 93, // 56 BCN + 23 SNN + 14 THERAPY
    expectedBand: 5,
    expectedRatio: "1:1.5 (day)"
  },
  {
    name: "Test 7: Edge Case - Maximum Score",
    description: "All scores = 5 (theoretical maximum)",
    resident: {
      name: "Max Score",
      bcn_mobility: '5', bcn_transfers: '5', bcn_washing: '5', bcn_dressing: '5',
      bcn_toileting: '5', bcn_continence: '5', bcn_feeding: '5', bcn_turning: '5',
      bcn_getting_up: '5', bcn_bed_mobility: '5', bcn_walking: '5', bcn_stairs: '5',
      snn_breathing: '5', snn_drugs: '5', snn_skin_care: '5', snn_treatment: '5', snn_observation: '5',
      therapy_communication: '5', therapy_cognitive: '5', therapy_behaviour: '5'
    },
    expectedScore: 100, // 60 BCN + 25 SNN + 15 THERAPY (capped at maximums)
    expectedBand: 5,
    expectedRatio: "1:1.5 (day)"
  },
  {
    name: "Test 8: Band Threshold - Low to Moderate",
    description: "Score exactly at threshold (21 - crosses into Band 2)",
    resident: {
      name: "Threshold LowMod",
      bcn_mobility: '1', bcn_transfers: '1', bcn_washing: '2', bcn_dressing: '1',
      bcn_toileting: '1', bcn_continence: '1', bcn_feeding: '1', bcn_turning: '1',
      bcn_getting_up: '1', bcn_bed_mobility: '1', bcn_walking: '2', bcn_stairs: '2',
      snn_breathing: '0', snn_drugs: '1', snn_skin_care: '1', snn_treatment: '0', snn_observation: '1',
      therapy_communication: '1', therapy_cognitive: '1', therapy_behaviour: '1'
    },
    expectedScore: 21, // 15 BCN + 3 SNN + 3 THERAPY (just crosses into Band 2)
    expectedBand: 2,
    expectedRatio: "1:6 (day)"
  }
];

// Run Tests
console.log('\n🧪 NPDS Calculation Test Suite\n');
console.log('Testing Northwick Park Dependency Score implementation...\n');
console.log('═'.repeat(80));

let passCount = 0;
let failCount = 0;

testCases.forEach((test, index) => {
  console.log(`\n📋 ${test.name}`);
  console.log(`   ${test.description}`);
  console.log('   ' + '─'.repeat(76));

  const score = calculateNDPSScore(test.resident);
  const band = getNDPSBand(score);

  const scoreMatch = score === test.expectedScore;
  const bandMatch = band.band === test.expectedBand;

  console.log(`   Resident: ${test.resident.name}`);
  console.log(`   NPDS Score: ${score} (expected: ${test.expectedScore}) ${scoreMatch ? '✅' : '❌'}`);
  console.log(`   Band: ${band.band} - ${band.name} (expected: Band ${test.expectedBand}) ${bandMatch ? '✅' : '❌'}`);
  console.log(`   Staff Ratio: ${test.expectedRatio}`);

  if (scoreMatch && bandMatch) {
    console.log(`   Result: ✅ PASS`);
    passCount++;
  } else {
    console.log(`   Result: ❌ FAIL`);
    failCount++;
    if (!scoreMatch) {
      console.log(`   ⚠️  Score mismatch: got ${score}, expected ${test.expectedScore}`);
    }
    if (!bandMatch) {
      console.log(`   ⚠️  Band mismatch: got Band ${band.band}, expected Band ${test.expectedBand}`);
    }
  }
});

console.log('\n' + '═'.repeat(80));
console.log('\n📊 Test Summary');
console.log('─'.repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passCount} ✅`);
console.log(`Failed: ${failCount} ❌`);
console.log(`Success Rate: ${Math.round((passCount / testCases.length) * 100)}%`);

if (failCount === 0) {
  console.log('\n🎉 All tests passed! NPDS calculations are working correctly.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
