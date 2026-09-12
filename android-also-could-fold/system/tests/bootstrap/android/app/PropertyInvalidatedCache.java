package android.app;
/** Model the missing nonce mapping in an unbound app_process. */
public final class PropertyInvalidatedCache {
    public static boolean disabled;
    public static boolean failDisable;
    public static int backendValue;
    public static void disableForTestMode() {
        if (failDisable) throw new IllegalStateException("cache setup rejected");
        disabled = true;
    }
    public static int query() {
        if (!disabled) throw new IllegalStateException("ApplicationSharedMemory not initialized");
        return backendValue;
    }
}
