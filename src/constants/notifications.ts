import type { NotificationType } from '../types/app'

export const NOTIFICATION_MESSAGES: Record<NotificationType, { title: string; body: string }[]> = {
  daily_reminder: [
    { title: 'Fit Buddies', body: 'Your streak needs one action. Log now.' },
    { title: 'Fit Buddies', body: 'One log. One win. Open the app.' },
    { title: 'Fit Buddies', body: 'Your crew is moving. Do not fall behind today.' },
  ],
  streak_warning: [
    { title: 'Streak at Risk', body: 'Your crew is active. Do not disappear today.' },
    { title: 'Last Chance', body: 'Log one action before midnight. Keep your streak alive.' },
    { title: 'Still Time', body: 'One action is all it takes. Open the app.' },
  ],
  streak_lost: [
    { title: 'Comeback Bonus Open', body: 'Comeback bonus is open. Log one action now.' },
    { title: 'Get Back In', body: 'Your streak reset. Your comeback starts today.' },
    { title: 'Still Here?', body: 'Log one action and unlock your comeback bonus.' },
  ],
  friend_activity: [
    { title: 'Your Crew Is Moving', body: 'Your friends are logging. Do not disappear today.' },
    { title: 'Activity Alert', body: 'Someone just logged. Keep the energy going.' },
    { title: 'The Squad Is Active', body: 'Your group is on a roll. Time to add your log.' },
  ],
  chat_message: [
    { title: 'New Message', body: 'Your circle sent a message. Open the app.' },
  ],
  challenge_deadline: [
    { title: 'Challenge Ending Soon', body: 'Your group needs one more push today.' },
    { title: '24 Hours Left', body: 'Final push for the group challenge. Log now.' },
  ],
  xp_gap: [
    { title: 'Close the Gap', body: 'You are behind on XP. One log closes the gap.' },
    { title: 'XP Alert', body: 'Your crew pulled ahead. Log something now.' },
  ],
  leaderboard_overtake: [
    { title: 'Someone Passed You', body: 'One log closes the gap. Open the app.' },
    { title: 'Leaderboard Shift', body: 'Your rank dropped. One action gets it back.' },
  ],
  comeback_bonus: [
    { title: 'Comeback Bonus', body: 'Log any action now and earn 40 bonus XP.' },
  ],
}

export function getNotificationMessage(type: NotificationType): { title: string; body: string } {
  const options = NOTIFICATION_MESSAGES[type]
  return options[Math.floor(Math.random() * options.length)]
}
