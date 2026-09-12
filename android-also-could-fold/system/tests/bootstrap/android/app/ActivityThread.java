package android.app;
import android.content.Context;
public final class ActivityThread {
    public static ActivityThread current;
    public static int starts;
    public static ActivityThread currentActivityThread() { return current; }
    public static ActivityThread systemMain() {
        PropertyInvalidatedCache.query();
        starts++;
        return current = new ActivityThread();
    }
    public Context getSystemContext() {
        PropertyInvalidatedCache.query();
        return new Context();
    }
}
