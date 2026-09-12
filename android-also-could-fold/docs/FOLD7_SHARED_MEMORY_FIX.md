# Fold7 shell startup compatibility

Upstream: https://github.com/keepYaoung/android-also-could-fold

Base revision: `90402ec3916cbaaffc2c6b2cb6b226a1536ffdde` (0.4.17).
Candidate: `0.4.18-fold7-fix`, versionCode 26, application ID `dev.tommy.foldshell`.

## Diagnosis

The reported SM-F966N exception is
`IllegalStateException: ApplicationSharedMemory not initialized`.
No complete Samsung stack trace or physical device was available for this change.

The app launches LocalFoldDaemon through its authenticated local ADB stream and
`app_process`. This standalone process does not receive normal `bindApplication`
initialization, which supplies the system-owned shared-memory mapping.
The old engine calls ActivityThread.systemMain and creates a shell package
context without preparing framework caches that may consult that mapping.

This is the code-supported candidate diagnosis. Recent AOSP PropertyInvalidatedCache
revisions already catch a missing mapping internally; Samsung firmware can differ.
Successful compilation or AOSP runtime tests alone cannot prove the reported
Samsung exception has disappeared.

## Change

ShellRuntime calls `PropertyInvalidatedCache.disableForTestMode()` before
ActivityThread or package context initialization. This framework method disables
caching only inside the shell process. Queries still use their normal service
backend and permission checks. It does not enable test permissions or change
device settings. The normal UI app process is untouched.

No synthetic shared-memory region is installed: private invalidation nonces would
not track system_server state and could produce stale service results. The helper
requires shell UID 2000 and reuses an existing ActivityThread when present.
Persistent, temporary and sensor-probe entry points share the same bootstrap.
Daemon startup errors now retain their root cause and stack trace and exit with
status 1 after releasing the shared process lock.

V1/V2 rendering, model restrictions, capture protection, screen-off cleanup,
stop cleanup, lock exclusion, transition timings, saved settings and local ADB
pairing are unchanged. Disabling caches can add service calls; battery/performance
on the physical phone remains unmeasured.

Build Tools is explicitly set to 36.0.0 in both Android modules, matching the
SDK installation and standalone DEX compiler used by the workflow.

## Verification

- Existing FoldMotionTest covers motion, release, rendering geometry and related
  engine logic. ShellRuntimeTest covers seven host-model scenarios, including the
  original failure ordering, successful bootstrap, reuse, changing backend values,
  non-shell rejection, initialization failure and package access denial.
- The host framework fixtures are excluded from both APK and standalone DEX.
- `python3 tools/fold-system.py build` runs both host suites and compiles the engine DEX.
- CI builds the debug APK and instrumentation APK, runs lint, checks the APK
  signature and writes SHA-256 checksums.
- A separate Android 16/API 36 emulator job runs the actual production bootstrap
  through shell/app_process and queries sensor, display and power services. It
  also runs the existing encrypted ADB identity reload/tampering instrumentation test.
- Consult the linked Actions run for actual results. A workflow definition is not
  evidence that its tests ran. Physical Fold7 effects, wireless pairing, USB
  separation, reboot recovery and power usage are not validated by CI.

## Install on the phone (한국어)

1. 기존 앱이나 알림에서 **효과 끄기**를 누릅니다.
2. `Fold-Transition-0.4.18-fold7-fix.apk`를 다운로드해 엽니다.
   Android가 요청하면 설치에 사용하는 앱의 **이 출처 허용**을 승인합니다.
3. 서명 불일치로 덮어쓰기 설치가 거부될 때만 기존 앱 삭제 후 설치가 필요합니다.
   삭제하면 설정과 페어링 키가 없어지므로 다시 페어링해야 합니다.
4. Wi-Fi와 개발자 옵션의 **무선 디버깅**을 켭니다. 새 설치라면 앱의
   **최초 연결 설정**을 누른 후 Android의 페어링 코드 창을 유지한 채
   앱 알림의 **코드 입력**으로 페어링합니다. Shizuku는 필요 없습니다.
5. 효과를 켜서 실행 상태를 확인하고 V1/V2 각각 커버·내부·켜진 잠금 화면의
   접힘/펼침, 멈춘 뒤 효과 해제, 화면 꺼짐/AOD 및 **효과 끄기**를 확인합니다.
6. 오류가 계속되면 앱에 표시된 전체 오류와 Android/One UI 버전이 필요합니다.

This is a development/debug-signed APK. The upstream signing key is unavailable,
so update compatibility with an existing upstream APK is not guaranteed. Separate
CI runs may produce different development signing certificates.

## Primary source references

- [AOSP ActivityThread: bindApplication and systemMain](https://github.com/aosp-mirror/platform_frameworks_base/blob/android16-release/core/java/android/app/ActivityThread.java)
- [AOSP PropertyInvalidatedCache: query and disableForTestMode](https://github.com/aosp-mirror/platform_frameworks_base/blob/android16-release/core/java/android/app/PropertyInvalidatedCache.java)
- [AOSP ApplicationSharedMemory: getInstance and setInstance](https://github.com/aosp-mirror/platform_frameworks_base/blob/master/core/java/com/android/internal/os/ApplicationSharedMemory.java)
