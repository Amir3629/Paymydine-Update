plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
}
android {
    namespace = "com.paymydine.mobile"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.paymydine.mobile"
        minSdk = 26
        targetSdk = 36
        versionCode = 45
        // PMD_ANDROID_0_3_30_LOCAL_FIRST_V104
        // V104 Local-First V2 keeps SQLite as the cashier-facing authority; Cloud is background sync.
        // PMD_ANDROID_0_3_30_PAGE_SCALE_V104
        // V104 resets WebView page scale on rotation and lets online Quick POS CSS hotfix from Cloud.
        // PMD_ANDROID_0_3_29_PORTRAIT_SCALE_V103
        // V103 preserves V102 device classes while isolating legacy phone-scale CSS from tablet portrait.
        // PMD_ANDROID_0_3_28_RESPONSIVE_MATRIX_V102
        // V102 separates phone/tablet portrait modes and preserves natural scale.
        // PMD_ANDROID_0_3_27_RECONNECT_CASH_V101
        // V101 makes reconnect snapshots non-destructive and guarantees queued
        // offline Cash is rebound to the canonical Cloud order before replay.
        // PMD_ANDROID_0_3_26_NORMAL_BUTTONS_V100
        // PMD_ANDROID_NORMAL_PAGE_SCALE_V100
        // PMD_ANDROID_0_3_25_MOBILE_BALANCED_V99 (preserved baseline)
        // PMD_ANDROID_0_3_24_MOBILE_FIT_V98 (preserved baseline)
        // PMD_ANDROID_0_3_23_PORTRAIT_XL_V97 (superseded presentation baseline)
        // PMD_ANDROID_0_3_22_PORTRAIT_BREAKPOINT_V96 (preserved baseline)
        // PMD_ANDROID_0_3_21_LARGE_TOUCH_V95 (preserved baseline)
        // PMD_ANDROID_0_3_20_MOBILE_UI_V94 (preserved baseline)
        // PMD_ANDROID_0_3_20_OFFLINE_COMPLETE_V23 (preserved contract)
        // V99 trims the V98 scale slightly while preserving natural mobile fit.
        versionName = "0.3.32-v107-local-first" // PMD_ANDROID_0_3_28_RESPONSIVE_MATRIX_V102
        // PMD_ANDROID_V104_LOCAL_FIRST_RELEASE_PROMOTED
        // PMD_ANDROID_V105_BUNDLED_ASSETS_SYNCED
        // PMD_ANDROID_0_3_31_V106_LOCAL_FIRST
        // PMD_ANDROID_0_3_31_V106_RELEASE_FINAL
        // PMD_ANDROID_0_3_32_V107_LOCAL_FIRST
        // PMD_ANDROID_0_3_32_V107_RELEASE_FINAL
        // PMD_ANDROID_0_3_32_V107_RELEASE_FINAL_R2
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "SYNC_PROTOCOL_VERSION", "\"pmd-sync-v1\"")
    }
    signingConfigs {
        create("preview") {
            storeFile = file(
                System.getProperty("user.home") +
                    "/.android/debug.keystore",
            )
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    buildTypes {
        debug {
            applicationIdSuffix = ".pospreview"
            versionNameSuffix = "-debug"
            signingConfig = signingConfigs.getByName("preview")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging {
        resources.excludes += setOf("/META-INF/{AL2.0,LGPL2.1}", "META-INF/LICENSE*", "META-INF/NOTICE*")
    }
}

val canonicalPosAssetsDir =
    layout.buildDirectory.dir("generated/pmdCanonicalPosAssets")

android.sourceSets.getByName("main").assets.srcDir(
    canonicalPosAssetsDir,
)

val prepareCanonicalPosAssets by tasks.registering(Copy::class) {
    // PMD_ANDROID_BUNDLED_CANONICAL_POS_UI_V18
    // PMD_ANDROID_V107_OFFLINE_OVERRIDE_BUNDLE
    // Package the exact production Quick POS CSS/JS in the APK. The offline
    // shell therefore renders the same product instead of a hand-built clone.
    into(canonicalPosAssetsDir)

    from(rootProject.projectDir.resolve("../../app/admin/assets/css")) {
        include(
            "pmd-floor-v1.css",
            "pmd-floor-v1-stable-v11.css",
            "pmd-floor-v1-native-smart-v20.css",
            "pmd-reservations2-floor-canvas-v310.css",
            "pmd-reservations2-floor-toolbar-v316.css",
            "pmd-reservations2-floor-reservation-v312.css",
            "pmd-dashboard-lab-exact-floor-v1.css",
            "pmd-shared-floor-multi-floor-v1.css",
            "push-notifications.css",
            "pmd-quick-pos-v1.css",
            "pmd-qpos-android-form-factor-v107.css",
        )
        into("pmd-canonical/css")
    }

    from(rootProject.projectDir.resolve("../../app/admin/assets/js")) {
        include(
            "pmd-dashboard-lab-exact-floor-v1.js",
            "pmd-shared-floor-multi-floor-v1.js",
            "push-notifications.js",
            "pmd-quick-pos-v1.js",
            "pmd-qpos-android-form-factor-v107.js",
            "pmd-site-access-hub-v13.js",
        )
        into("pmd-canonical/js")
    }

    from(rootProject.projectDir.resolve("../../app/admin/assets/images")) {
        include("pmd-favicon-final-20260822.svg")
        into("pmd-canonical/images")
    }
}

tasks.named("preBuild").configure {
    dependsOn(prepareCanonicalPosAssets)
}

kotlin { jvmToolchain(17) }
dependencies {
    // PMD_ZCS_VENDOR_SDK_V5
    // SmartPos vendor AAR is injected by the ZCS hardware build workflow.
    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.jar", "*.aar"))))
    val composeBom = platform("androidx.compose:compose-bom:2026.04.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    testImplementation("junit:junit:4.13.2")
}

