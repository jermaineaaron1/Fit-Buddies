import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Image } from 'expo-image'
import { useRouter, useFocusEffect } from 'expo-router'
import { supabase } from '../../../src/lib/supabase'
import { useAuthStore } from '../../../src/store/authStore'
import { useCircleStore } from '../../../src/store/circleStore'
import { useBreakpoint } from '../../../src/hooks/useBreakpoint'
import { PageContainer } from '../../../src/components/layout/PageContainer'
import { AnimatedScreen } from '../../../src/components/ui/AnimatedScreen'
import { CompactCard } from '../../../src/components/ui/CompactCard'
import { CompactButton } from '../../../src/components/ui/CompactButton'
import { SectionHeader } from '../../../src/components/ui/SectionHeader'
import { EmptyState } from '../../../src/components/ui/EmptyState'
import { LoadingState } from '../../../src/components/ui/LoadingState'
import { NoCircleBanner } from '../../../src/components/ui/NoCircleBanner'
import { AnimatedPressable } from '../../../src/components/ui/AnimatedPressable'
import { timeAgo } from '../../../src/lib/circleSnapshot'
import { colors, layout, radius, type } from '../../../src/constants/theme'

interface FeedRow {
  id: string
  title: string
  meta: string
  author: string
  createdAt: string
  imageUrl?: string | null
}

interface FuelData {
  recipes: FeedRow[]
  grocery: FeedRow[]
  supplements: FeedRow[]
  savedMeals: FeedRow[]
}

const EMPTY: FuelData = { recipes: [], grocery: [], supplements: [], savedMeals: [] }

export default function CrewFoodScreen() {
  const router = useRouter()
  const { isDesktop } = useBreakpoint()
  const { profile } = useAuthStore()
  const { circle } = useCircleStore()

  const [data, setData] = useState<FuelData>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async () => {
    if (!circle?.id) { setLoading(false); return }

    const [recipes, grocery, supplements, meals] = await Promise.all([
      supabase.from('recipes')
        .select('id, title, calories_estimate, protein_estimate, estimated_cost, image_url, created_at, profiles(display_name)')
        .eq('circle_id', circle.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('grocery_posts')
        .select('id, item_name, store, price, created_at, profiles(display_name)')
        .eq('circle_id', circle.id).order('created_at', { ascending: false }).limit(6),
      supabase.from('supplement_posts')
        .select('id, supplement_name, category, price, created_at, profiles(display_name)')
        .eq('circle_id', circle.id).order('created_at', { ascending: false }).limit(6),
      // "Saved meals" is your own logging history, not a separate table — the
      // meals you actually repeat are the ones worth surfacing.
      profile?.id
        ? supabase.from('meal_logs')
          .select('id, food_name, meal_type, calories, protein_g, logged_at, food_image_url')
          .eq('user_id', profile.id).order('logged_at', { ascending: false }).limit(24)
        : Promise.resolve({ data: [] as any[] }),
    ])

    const seen = new Set<string>()
    const savedMeals: FeedRow[] = []
    for (const row of ((meals.data as any[]) ?? [])) {
      const key = (row.food_name ?? '').trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      savedMeals.push({
        id: row.id,
        title: row.food_name,
        meta: `${row.meal_type} · ${row.calories ?? '—'} kcal · ${row.protein_g ?? '—'} g protein`,
        author: 'You',
        createdAt: row.logged_at,
        imageUrl: row.food_image_url,
      })
      if (savedMeals.length >= 6) break
    }

    setData({
      recipes: ((recipes.data as any[]) ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        meta: [
          row.calories_estimate ? `${row.calories_estimate} kcal` : null,
          row.protein_estimate ? `${row.protein_estimate} g protein` : null,
          row.estimated_cost ? `RM ${row.estimated_cost}` : null,
        ].filter(Boolean).join(' · ') || 'Recipe',
        author: row.profiles?.display_name ?? 'Someone',
        createdAt: row.created_at,
        imageUrl: row.image_url,
      })),
      grocery: ((grocery.data as any[]) ?? []).map((row) => ({
        id: row.id,
        title: row.item_name,
        meta: [row.store, row.price ? `RM ${row.price}` : null].filter(Boolean).join(' · ') || 'Grocery find',
        author: row.profiles?.display_name ?? 'Someone',
        createdAt: row.created_at,
      })),
      supplements: ((supplements.data as any[]) ?? []).map((row) => ({
        id: row.id,
        title: row.supplement_name,
        meta: [row.category, row.price ? `RM ${row.price}` : null].filter(Boolean).join(' · ') || 'Supplement',
        author: row.profiles?.display_name ?? 'Someone',
        createdAt: row.created_at,
      })),
      savedMeals,
    })
    setLoading(false)
  }, [circle?.id, profile?.id])

  useFocusEffect(useCallback(() => { load() }, [load]))

  async function onRefresh() { setRefreshing(true); await load(); setRefreshing(false) }

  function feedSection(
    title: string,
    rows: FeedRow[],
    options: {
      icon: keyof typeof Ionicons.glyphMap
      addLabel?: string
      addRoute?: string
      emptyMessage: string
      onRowPress?: (row: FeedRow) => void
    },
  ) {
    return (
      <View style={styles.section}>
        <SectionHeader
          title={title}
          actionLabel={options.addLabel}
          onAction={options.addRoute ? () => router.push(options.addRoute as never) : undefined}
        />
        {loading ? (
          <LoadingState rows={2} rowHeight={48} />
        ) : rows.length ? (
          <CompactCard padded={false} style={styles.feedCard}>
            {rows.map((row) => (
              <AnimatedPressable
                key={row.id}
                style={styles.feedRow}
                onPress={() => options.onRowPress?.(row)}
                disabled={!options.onRowPress}
                accessibilityRole={options.onRowPress ? 'button' : undefined}
                accessibilityLabel={`${row.title}, ${row.meta}, by ${row.author}`}
              >
                <View style={styles.feedThumb}>
                  {row.imageUrl
                    ? <Image source={{ uri: row.imageUrl }} style={styles.feedImage} contentFit="cover" />
                    : <Ionicons name={options.icon} size={15} color={colors.gold} />}
                </View>
                <View style={styles.feedCopy}>
                  <Text style={styles.feedTitle} numberOfLines={1}>{row.title}</Text>
                  <Text style={styles.feedMeta} numberOfLines={1}>{row.meta}</Text>
                </View>
                <View style={styles.feedRight}>
                  <Text style={styles.feedAuthor} numberOfLines={1}>{row.author}</Text>
                  <Text style={styles.feedTime}>{timeAgo(row.createdAt)}</Text>
                </View>
              </AnimatedPressable>
            ))}
          </CompactCard>
        ) : (
          <EmptyState
            icon={options.icon}
            title="Nothing shared yet"
            message={options.emptyMessage}
            actionLabel={options.addLabel}
            onAction={options.addRoute ? () => router.push(options.addRoute as never) : undefined}
            tone="gold"
            compact
          />
        )}
      </View>
    )
  }

  if (!circle) {
    return <PageContainer><NoCircleBanner /></PageContainer>
  }

  const intro = (
    <AnimatedScreen>
      <CompactCard accent="gold">
        <View style={styles.introHead}>
          <Ionicons name="people" size={15} color={colors.gold} />
          <Text style={styles.introTitle}>Crew Kitchen</Text>
        </View>
        <Text style={styles.introCopy}>
          What the crew is cooking, buying and taking. Logging your own food happens on Fuel.
        </Text>
        <View style={styles.introActions}>
          <CompactButton label="Log food" icon="add" tone="gold" onPress={() => router.push('/(app)/share' as never)} />
          <CompactButton label="Share a recipe" icon="book-outline" onPress={() => router.push('/(app)/share/recipe' as never)} />
        </View>
      </CompactCard>
    </AnimatedScreen>
  )

  const sections = [
    <AnimatedScreen key="recipes" delay={40}>
      {feedSection('Crew recipes', data.recipes, {
        icon: 'book-outline', addLabel: 'Share', addRoute: '/(app)/share/recipe',
        emptyMessage: 'Post a meal your buddies can cook and repeat.',
      })}
    </AnimatedScreen>,
    <AnimatedScreen key="grocery" delay={70}>
      {feedSection('Grocery finds', data.grocery, {
        icon: 'bag-handle-outline', addLabel: 'Post', addRoute: '/(app)/share/grocery',
        emptyMessage: 'Share a product, its price, and where you found it.',
      })}
    </AnimatedScreen>,
    <AnimatedScreen key="supplements" delay={100}>
      {feedSection('Supplements', data.supplements, {
        icon: 'flask-outline', addLabel: 'Post', addRoute: '/(app)/share/supplement',
        emptyMessage: 'Share what helps and why, with claims kept grounded.',
      })}
    </AnimatedScreen>,
    <AnimatedScreen key="saved" delay={130}>
      {feedSection('Your saved meals', data.savedMeals, {
        icon: 'bookmark-outline',
        emptyMessage: 'Meals you log show up here, ready to repeat.',
        onRowPress: (row) => router.push(`/(app)/log/meal?repeat=${encodeURIComponent(row.title)}` as never),
      })}
    </AnimatedScreen>,
  ]

  return (
    <PageContainer onRefresh={onRefresh} refreshing={refreshing}>
      {intro}
      {isDesktop ? (
        <View style={styles.columns}>
          <View style={styles.column}>{sections[0]}{sections[2]}</View>
          <View style={styles.column}>{sections[1]}{sections[3]}</View>
        </View>
      ) : sections}
    </PageContainer>
  )
}

const styles = StyleSheet.create({
  section: { gap: 8 },
  introHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  introTitle: { color: colors.text, fontFamily: type.display, fontSize: 14, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  introCopy: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 5, marginBottom: 10 },
  introActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  feedCard: { paddingHorizontal: 11 },
  feedRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    minHeight: layout.touch + 6, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  feedThumb: {
    width: 34, height: 34, borderRadius: radius.sm, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardRaised,
  },
  feedImage: { width: '100%', height: '100%' },
  feedCopy: { flex: 1, minWidth: 0, gap: 1 },
  feedTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  feedMeta: { color: colors.textMuted, fontSize: 10.5 },
  feedRight: { alignItems: 'flex-end', gap: 1, maxWidth: 96 },
  feedAuthor: { color: colors.textSecondary, fontSize: 10.5, fontWeight: '700' },
  feedTime: { color: colors.textMuted, fontSize: 9.5 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  column: { flex: 1, gap: 20, minWidth: 0 },
})
