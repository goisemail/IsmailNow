export type StorageCollection = 'tasks' | 'habits'

const LEGACY_KEYS: Record<StorageCollection, string> = {
  tasks: 'ismailnow_tasks_v1',
  habits: 'habbitnow_habits_v1',
}

export function accountOwnerId(uid: string, isGuest = false): string {
  return isGuest ? 'guest:local' : `google:${uid}`
}

export function accountStorageKey(ownerId: string, collection: StorageCollection): string {
  return `ismailnow:v2:${encodeURIComponent(ownerId)}:${collection}`
}

export function migrateLegacyStorage(ownerId: string): void {
  for (const collection of Object.keys(LEGACY_KEYS) as StorageCollection[]) {
    const legacyKey = LEGACY_KEYS[collection]
    const scopedKey = accountStorageKey(ownerId, collection)

    if (localStorage.getItem(scopedKey) !== null) continue

    const legacyValue = localStorage.getItem(legacyKey)
    if (legacyValue === null) continue

    localStorage.setItem(scopedKey, legacyValue)
    if (localStorage.getItem(scopedKey) === legacyValue) {
      localStorage.removeItem(legacyKey)
    }
  }
}
