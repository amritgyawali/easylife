# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v54.0.0/ before writing any code.

## Do not upgrade the SDK

This project is pinned to **Expo SDK 54** on purpose. The iOS Expo Go build available
on the App Store runs SDK 54, and Expo Go only ever supports one SDK version at a
time — so moving to 55/56/57 makes the project unopenable on the physical iPhone it
is developed against ("Project is incompatible with this version of Expo Go").

Note that SDK 54 uses classic per-package versioning (`expo-router@6.x`,
`expo-status-bar@3.x`, `expo-linking@8.x`), not the unified `57.x` scheme. Never
hand-write these versions — run `npx expo install --check` and let the installed
`expo` package's own dependency map decide.

Revisit only when an SDK 57 Expo Go ships for iOS, or when the project moves to a
development build, at which point the Expo Go SDK ceiling no longer applies.
