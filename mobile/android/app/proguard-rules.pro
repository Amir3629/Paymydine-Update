-keepattributes SourceFile,LineNumberTable
-keep class com.paymydine.mobile.data.** { *; }

# PMD_ZCS_Z100_AUTO_SECONDARY_V18
# The SmartPos SDK is reached through reflection so release shrinking must keep it.
-keep class com.zcs.sdk.** { *; }
-dontwarn com.zcs.sdk.**
