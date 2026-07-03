export const DEFAULT_DAILY_QUESTS = [
  {
    title: 'Log a workout',
    description: 'Complete and log any workout today.',
    xp_reward: 20,
    quest_type: 'workout',
  },
  {
    title: 'Log a meal',
    description: 'Track at least one meal today.',
    xp_reward: 20,
    quest_type: 'meal',
  },
  {
    title: 'Log your steps',
    description: 'Enter your step count for today.',
    xp_reward: 20,
    quest_type: 'steps',
  },
  {
    title: 'Send an encouragement',
    description: 'Write a message in the group chat.',
    xp_reward: 20,
    quest_type: 'chat',
  },
  {
    title: 'Share something healthy',
    description: 'Post a recipe, grocery find, or supplement tip.',
    xp_reward: 20,
    quest_type: 'share',
  },
] as const

export const MOTIVATIONAL_MESSAGES = {
  daily: [
    'Consistency beats perfection every single time.',
    'You do not have to be great to start. But you have to start to be great.',
    'One rep. One log. One step. That is enough for today.',
    'Your future self is watching. Make them proud.',
    'Progress is not always visible. But it is always real.',
    'Show up today. Your crew notices.',
  ],
  comeback: [
    'You are back. That is the hardest part.',
    'Everyone has a bad week. Not everyone comes back. You did.',
    'The comeback is always stronger than the setback.',
    'Missing days happens. Giving up does not have to.',
    'One action today resets the momentum. Go.',
  ],
  encouragement: [
    'You are doing better than you think.',
    'Hard days count too. You are still here.',
    'Not every log needs to be perfect. Just real.',
    'Your effort today is someone else\'s inspiration tomorrow.',
    'Tired and still showing up? That is elite.',
  ],
  hard_day: [
    'Log one thing. Anything. That is your win for today.',
    'Hard days are part of the game. You are still in it.',
    'You do not need to crush it today. You just need to show up.',
    'Rest is a strategy. Logging rest is still showing up.',
    'Tomorrow starts with what you do right now. One log. Go.',
  ],
}
