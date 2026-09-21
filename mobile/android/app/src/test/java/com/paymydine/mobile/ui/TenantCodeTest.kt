package com.paymydine.mobile.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class TenantCodeTest {
    @Test
    fun acceptsSubdomainCode() {
        assertEquals("tommo", normalizeTenantCode("tommo"))
    }

    @Test
    fun acceptsFullPayMyDineUrl() {
        assertEquals(
            "tommo",
            normalizeTenantCode("https://TOMMO.paymydine.com/admin/dashboard"),
        )
    }

    @Test
    fun rejectsDisplayNameWithSpaces() {
        assertNull(normalizeTenantCode("Tommo Restaurant"))
    }

    @Test
    fun acceptsHyphenatedTenantCode() {
        assertEquals(
            "my-restaurant",
            normalizeTenantCode("my-restaurant.paymydine.com"),
        )
    }
}
