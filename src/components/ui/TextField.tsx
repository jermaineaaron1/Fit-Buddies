import React from 'react'
import { View, Text, TextInput, StyleSheet, Platform, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native'
import { colors, layout, radius, type } from '../../constants/theme'

interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label?: string
  error?: string
  /**
   * `boxed` is the ordinary bordered field. `plain` is a borderless input used
   * where the field IS the heading — an editable food or exercise name at the
   * top of its own card, where a second box would just add a border to a
   * border.
   */
  variant?: 'boxed' | 'plain'
  multiline?: boolean
  containerStyle?: StyleProp<ViewStyle>
}

/**
 * The compact text field for the redesigned screens.
 *
 * `Input` still serves the screens that were not part of this pass; this is
 * deliberately a separate, denser control rather than a rewrite of that one,
 * so seventeen existing call sites do not shift underneath the redesign.
 */
export function TextField({
  label, error, variant = 'boxed', multiline = false, containerStyle, ...props
}: TextFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.gold}
        multiline={multiline}
        accessibilityLabel={props.accessibilityLabel ?? label}
        style={[
          variant === 'boxed' ? styles.boxed : styles.plain,
          multiline && styles.multiline,
          error ? styles.errored : null,
        ]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
}

const webReset = (Platform.OS === 'web' ? { outlineStyle: 'none' } : null) as object

const styles = StyleSheet.create({
  container: { gap: 5 },
  label: {
    color: colors.textMuted, fontFamily: type.display, fontSize: 9.5,
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.9,
  },
  boxed: {
    minHeight: layout.touch,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    backgroundColor: colors.cardRaised,
    paddingHorizontal: 11, paddingVertical: 10,
    color: colors.text, fontFamily: type.body, fontSize: 14,
    ...webReset,
  },
  plain: {
    minHeight: 32, paddingVertical: 4,
    color: colors.text, fontFamily: type.display, fontSize: 14,
    fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.3,
    ...webReset,
  },
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  errored: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 10.5 },
})
