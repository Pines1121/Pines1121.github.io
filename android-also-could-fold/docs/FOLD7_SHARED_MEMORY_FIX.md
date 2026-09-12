# Fold7 Android 17 shell startup compatibility

Upstream: https://github.com/keepYaoung/android-also-could-fold

Base revision: `90402ec3916cbaaffc2c6b2cb6b226a1536ffdde` (0.4.17).
Candidate: `0.4.19-fold7-android17`, versionCode 27, application ID `dev.tommy.foldshell`.
Reported device: Galaxy Z Fold7 SM-F966N, Android 17, One UI 9.0 beta.

## Diagnosis and correction to 0.4.18

The user's screenshot confirms that 0.4.18 still fails with
`IllegalStateException: ApplicationSharedMemory not initialized` on this firmware.
That version only disabled PropertyInvalidatedCache in the shell process. Its API 36
smoke test exercised sensor, display and power services, but omitted KeyguardManager.

The engine starts through local ADB and `app_process`, which does not receive
`ActivityThread.bindApplication` and its system-owned shared-memory descriptor.
Android 17's KeyguardManager constructor calls
`WindowManagerGlobal.getWindowManagerService()`. When the animator shared-memory
flag is enabled, that method directly calls
`ApplicationSharedMemory.getInstance().getCurrentAnimatorScale()`.
Disabling PropertyInvalidatedCache cannot prevent this separate direct read.

The engine only needs `KeyguardManager.isKeyguardLocked()`, which itself delegates
through its window service to `IWindowManager.isKeyguardLocked()`. ShellKeyguard now
obtains the real window service Binder and invokes that same read-only method.
It avoids initializing WindowManagerGlobal and its unrelated animator state.
It does not bypass keyguard, change animation settings, grant permissions, or
install fake shared memory. A missing service or denied/failed query remains
an error, never an unlocked result.

ShellRuntime's cache preparation and ActivityThread initialization remain intact.
The normal UI app is unaffected. Engine model and UID guards remain in place.
V1/V2 rendering, 1.5-second release, half-panel gradients, protected capture,
screen-off/stop cleanup, process lock, settings and ADB identity handling are preserved.

This is the code-supported failure path. A Samsung stack trace and a physical
test are still needed to rule out additional vendor-specific paths.

## Error details

Before reporting a daemon startup or engine failure, the helper sends a bounded
stack trace over the existing authenticated local stream. The UI keeps it only in
memory and offers **오류 상세 복사**. Copying is manual; there is no automatic upload
or persistent log. It includes app version, model, Android/API version and the
error trace, without adding pairing codes, keys, network addresses or screenshots.
The next connection attempt clears the previous trace.

## Verification

- `python3 tools/fold-system.py build` runs the existing FoldMotionTest, seven
  bootstrap host-model scenarios and five keyguard host-model scenarios, then
  compiles the standalone engine DEX. Host fixtures never enter the APK/DEX.
- Keyguard tests cover locked/unlocked changes, permission failure propagation,
  missing service and non-shell rejection.
- CI builds the debug APK and instrumentation APK, runs lint, verifies the APK
  signature and writes SHA-256 checksums.
- The runtime matrix uses API 36, Android 17 `37.2` and Android 17 `37.2-beta3`
  SDK system images. The compile/target SDK stays 36 to avoid unrelated behavior changes.
  Earlier `37.0` images timed out during emulator boot, before any application test.
  The matrix uses the newer available Android 17 image instead.
- Each runtime job verifies the actual API level, runs the old KeyguardManager
  path separately and records whether it reproduces the shared-memory error.
- The Android 17 test tries to enable the animator shared-memory feature flag
  only inside its disposable shell process, recording the result or any immutable
  flag limitation. Device settings and system services are not modified. This
  test helper is excluded from the installable APK and production engine DEX.
- The fixed-path test uses shell UID via `app_process`, queries the real lock
  state and constructs both production V1/V2 engines, including hidden display
  and compositor method resolution. It reads display info and closes both engines.
  It does not start folding, create visible effects, or capture the screen.
- CI installs the APK and runs the existing encrypted ADB identity reload and
  tampering instrumentation test. Consult the Actions run for actual results;
  a workflow definition alone is not proof of successful execution.
- Physical Fold7 effects, Samsung APIs, wireless pairing, USB separation, reboot
  recovery and power usage remain outside this emulator verification.

## Install on the phone (한국어)

1. 기존 앱이나 알림에서 **효과 끄기**를 누릅니다.
2. `Fold-Transition-0.4.19-fold7-android17.apk`를 다운로드해 엽니다.
   Android가 요청하면 설치에 사용하는 앱의 **이 출처 허용**을 승인합니다.
3. 이 APK는 개발용 서명입니다. 이전 APK와 서명이 달라 업데이트 설치가
   거부되는 경우에만 기존 앱을 삭제하고 설치하세요. 삭제하면 설정과 앱의
   페어링 키가 지워지므로 다시 페어링해야 합니다.
4. Wi-Fi와 개발자 옵션의 **무선 디버깅**을 켭니다. 새 설치라면 앱의
   **최초 연결 설정**을 누른 뒤 Android 페어링 코드 창을 유지한 채
   앱 알림의 **코드 입력**으로 페어링합니다. Shizuku는 필요 없습니다.
5. 효과를 켜고 V1/V2 각각 커버·내부·켜진 잠금 화면에서 접고 펼쳐보세요.
   정지 후 효과 해제, 화면 꺼짐/AOD와 **효과 끄기**도 확인하세요.
6. 오류가 계속되면 **오류 상세 복사**를 눌러 복사된 내용을 전달하세요.
   One UI 베타의 빌드 버전도 함께 알려주면 펌웨어 차이를 확인할 수 있습니다.

The upstream and previous CI signing keys are unavailable. Separate CI runs may
produce different development signing certificates, requiring reinstall/re-pairing.

## Primary source references

- [Android 17 KeyguardManager constructor and isKeyguardLocked](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/android17-release/core/java/android/app/KeyguardManager.java)
- [Android 17 WindowManagerGlobal animator initialization](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/android17-release/core/java/android/view/WindowManagerGlobal.java)
- [Android 17 ApplicationSharedMemory](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/android17-release/core/java/com/android/internal/os/ApplicationSharedMemory.java)
- [Android 17 ActivityThread bindApplication](https://android.googlesource.com/platform/frameworks/base/+/refs/heads/android17-release/core/java/android/app/ActivityThread.java)
