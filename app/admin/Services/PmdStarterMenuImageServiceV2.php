<?php

namespace Admin\Services;

/**
 * Compatibility alias for the original Quick Setup integration point.
 *
 * The stable class name is kept so existing onboarding code does not change,
 * while V5 supplies dish-aware matching, same-family fallback and the light
 * PayMyDine image profile.
 */
class PmdStarterMenuImageServiceV2 extends PmdStarterMenuImageServiceV5
{
}
