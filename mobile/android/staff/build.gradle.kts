plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// PMD_STAFF_ANDROID_SEPARATE_APP_V1_20261021
// Independent package, independent launcher, no POS pairing/kiosk privileges.
android {
    namespace = "com.paymydine.staff"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.paymydine.staff"
        minSdk = 26
        targetSdk = 36
        versionCode = 6
        versionName = "0.2.3")
    }
    buildTypes {
        debug { applicationIdSuffix = ".debug" }
        release {
            isMinifyEnabled = false
            isShrinkResources = false
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
kotlin { jvmToolchain(17) }

// PMD_STAFF_FUSED_LOCATION_V3_20261022: official Google Play Services foreground location;
// devices without Google services fall back to Android LocationManager.
dependencies {
    implementation("com.google.android.gms:play-services-location:21.4.0")
}
