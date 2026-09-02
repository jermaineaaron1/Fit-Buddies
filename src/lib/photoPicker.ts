import * as ImagePicker from 'expo-image-picker'

/** Bytes are cheap to send but slow to upload; this keeps captures sane. */
const QUALITY = 0.6

export type PhotoSource = 'camera' | 'library'

export interface PickedPhoto {
  uri: string
  /** Set when the pick did not produce an image — cancelled, or permission refused. */
  reason?: string
}

/** Shared by the meal scanner and the body-scan reader. */
export async function pickPhoto(source: PhotoSource): Promise<PickedPhoto | null> {
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync()
    if (!permission.granted) return { uri: '', reason: 'Camera permission denied.' }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], quality: QUALITY, allowsEditing: false,
    })
    if (result.canceled) return null
    return { uri: result.assets[0].uri }
  }

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return { uri: '', reason: 'Photo library permission denied.' }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'], quality: QUALITY, allowsEditing: false,
  })
  if (result.canceled) return null
  return { uri: result.assets[0].uri }
}

/**
 * Reads a local file:// or blob: URI into bytes. fetch() is the one approach
 * that works on web and native alike — expo-file-system would be native-only.
 */
export async function readPhotoBytes(uri: string): Promise<ArrayBuffer> {
  const response = await fetch(uri)
  return response.arrayBuffer()
}

export function photoContentType(uri: string): { contentType: string; extension: string } {
  const raw = uri.split('.').pop()?.toLowerCase().split('?')[0]
  if (raw === 'png') return { contentType: 'image/png', extension: 'png' }
  if (raw === 'webp') return { contentType: 'image/webp', extension: 'webp' }
  return { contentType: 'image/jpeg', extension: 'jpg' }
}
