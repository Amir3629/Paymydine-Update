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
        versionCode = 31
        versionName = "0.3.18-v91-request-failover" // PMD_ANDROID_0_3_18_REQUEST_FAILOVER
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
        )
        into("pmd-canonical/css")
    }

    from(rootProject.projectDir.resolve("../../app/admin/assets/js")) {
        include(
            "pmd-dashboard-lab-exact-floor-v1.js",
            "pmd-shared-floor-multi-floor-v1.js",
            "push-notifications.js",
            "pmd-quick-pos-v1.js",
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

