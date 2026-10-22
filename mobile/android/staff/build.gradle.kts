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
        versionCode = 4
        versionName = "0.2.1"
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
