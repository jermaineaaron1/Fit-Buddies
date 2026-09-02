import type { ExerciseType } from '../types/app'

// wger's public index is small (259 usable English entries, confirmed live) and
// misses most plainly-named staples — searching "push" there returns
// "Clap Push-UP" and "Drag Pushdown" but no "Push Up". This curated list fills
// that gap so the obvious thing you type is the first thing you're offered.
// Carrying the type means picking "Running" flips the row to cardio for you.
export interface CommonExercise {
  name: string
  type: ExerciseType
}

export const COMMON_EXERCISES: CommonExercise[] = [
  // Push
  { name: 'Push Up', type: 'strength' },
  { name: 'Push Up (Wide Grip)', type: 'strength' },
  { name: 'Push Up (Diamond)', type: 'strength' },
  { name: 'Push Up (Decline)', type: 'strength' },
  { name: 'Push Press', type: 'strength' },
  { name: 'Bench Press', type: 'strength' },
  { name: 'Incline Bench Press', type: 'strength' },
  { name: 'Decline Bench Press', type: 'strength' },
  { name: 'Dumbbell Bench Press', type: 'strength' },
  { name: 'Dumbbell Fly', type: 'strength' },
  { name: 'Cable Fly', type: 'strength' },
  { name: 'Chest Dip', type: 'strength' },
  { name: 'Overhead Press', type: 'strength' },
  { name: 'Dumbbell Shoulder Press', type: 'strength' },
  { name: 'Arnold Press', type: 'strength' },
  { name: 'Lateral Raise', type: 'strength' },
  { name: 'Front Raise', type: 'strength' },
  { name: 'Tricep Dip', type: 'strength' },
  { name: 'Tricep Pushdown', type: 'strength' },
  { name: 'Skull Crusher', type: 'strength' },
  { name: 'Close Grip Bench Press', type: 'strength' },

  // Pull
  { name: 'Pull Up', type: 'strength' },
  { name: 'Chin Up', type: 'strength' },
  { name: 'Lat Pulldown', type: 'strength' },
  { name: 'Barbell Row', type: 'strength' },
  { name: 'Dumbbell Row', type: 'strength' },
  { name: 'Seated Cable Row', type: 'strength' },
  { name: 'T-Bar Row', type: 'strength' },
  { name: 'Face Pull', type: 'strength' },
  { name: 'Rear Delt Fly', type: 'strength' },
  { name: 'Shrug', type: 'strength' },
  { name: 'Bicep Curl', type: 'strength' },
  { name: 'Hammer Curl', type: 'strength' },
  { name: 'Preacher Curl', type: 'strength' },
  { name: 'Concentration Curl', type: 'strength' },
  { name: 'Deadlift', type: 'strength' },
  { name: 'Romanian Deadlift', type: 'strength' },
  { name: 'Sumo Deadlift', type: 'strength' },
  { name: 'Rack Pull', type: 'strength' },

  // Legs
  { name: 'Squat', type: 'strength' },
  { name: 'Back Squat', type: 'strength' },
  { name: 'Front Squat', type: 'strength' },
  { name: 'Goblet Squat', type: 'strength' },
  { name: 'Bulgarian Split Squat', type: 'strength' },
  { name: 'Hack Squat', type: 'strength' },
  { name: 'Leg Press', type: 'strength' },
  { name: 'Leg Extension', type: 'strength' },
  { name: 'Leg Curl', type: 'strength' },
  { name: 'Lunge', type: 'strength' },
  { name: 'Walking Lunge', type: 'strength' },
  { name: 'Step Up', type: 'strength' },
  { name: 'Hip Thrust', type: 'strength' },
  { name: 'Glute Bridge', type: 'strength' },
  { name: 'Calf Raise', type: 'strength' },
  { name: 'Seated Calf Raise', type: 'strength' },
  { name: 'Box Jump', type: 'strength' },

  // Core
  { name: 'Plank', type: 'strength' },
  { name: 'Side Plank', type: 'strength' },
  { name: 'Crunch', type: 'strength' },
  { name: 'Sit Up', type: 'strength' },
  { name: 'Hanging Leg Raise', type: 'strength' },
  { name: 'Russian Twist', type: 'strength' },
  { name: 'Mountain Climber', type: 'strength' },
  { name: 'Ab Wheel Rollout', type: 'strength' },
  { name: 'Cable Crunch', type: 'strength' },
  { name: 'Dead Bug', type: 'strength' },

  // Full body / conditioning
  { name: 'Burpee', type: 'strength' },
  { name: 'Kettlebell Swing', type: 'strength' },
  { name: 'Clean and Jerk', type: 'strength' },
  { name: 'Snatch', type: 'strength' },
  { name: 'Thruster', type: 'strength' },
  { name: 'Farmer Carry', type: 'strength' },
  { name: 'Battle Ropes', type: 'strength' },

  // Cardio
  { name: 'Running', type: 'cardio' },
  { name: 'Jogging', type: 'cardio' },
  { name: 'Walking', type: 'cardio' },
  { name: 'Treadmill Run', type: 'cardio' },
  { name: 'Cycling', type: 'cardio' },
  { name: 'Stationary Bike', type: 'cardio' },
  { name: 'Swimming', type: 'cardio' },
  { name: 'Rowing Machine', type: 'cardio' },
  { name: 'Elliptical', type: 'cardio' },
  { name: 'Stair Climber', type: 'cardio' },
  { name: 'Jump Rope', type: 'cardio' },
  { name: 'Rock Climbing', type: 'cardio' },
  { name: 'Hiking', type: 'cardio' },
  { name: 'HIIT Circuit', type: 'cardio' },
  { name: 'Shadow Boxing', type: 'cardio' },
  { name: 'Heavy Bag Work', type: 'cardio' },
  { name: 'Sprint Intervals', type: 'cardio' },
]

// Prefix matches first, then substring — same ranking rule as the wger library.
export function suggestCommonExercises(query: string, limit = 5): CommonExercise[] {
  const q = query.trim().toLowerCase()
  if (q.length < 2) return []
  const prefix: CommonExercise[] = []
  const contains: CommonExercise[] = []
  for (const exercise of COMMON_EXERCISES) {
    const name = exercise.name.toLowerCase()
    if (name.startsWith(q)) prefix.push(exercise)
    else if (name.includes(q) && contains.length < limit) contains.push(exercise)
  }
  return [...prefix, ...contains].slice(0, limit)
}
