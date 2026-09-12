package android.content;
import android.app.PropertyInvalidatedCache;
public class Context {
    public static boolean failPackage;
    public Context createPackageContext(String name, int flags) {
        PropertyInvalidatedCache.query();
        if (!name.equals("com.android.shell") || flags != 0) throw new AssertionError("wrong identity");
        if (failPackage) throw new SecurityException("package access denied");
        return this;
    }
}
