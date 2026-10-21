pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "PayMyDineAndroid"
include(":app")
// PMD_STAFF_ANDROID_SEPARATE_APP_V1_20261021 — independent installable APK.
include(":staff")
