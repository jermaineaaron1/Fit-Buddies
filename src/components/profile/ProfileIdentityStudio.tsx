import React from 'react'
import { Text } from 'react-native'
import { Card } from '../ui/Card'
import { colors } from '../../constants/theme'

export function ProfileIdentityStudio() {
  return <Card><Text style={{ color: colors.textSecondary }}>Profile photo upload is currently available in the desktop app.</Text></Card>
}
