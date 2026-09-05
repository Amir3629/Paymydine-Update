<?php

namespace Admin\Services;

/**
 * Compatibility alias for the original Quick Setup integration point.
 *
 * PmdTenantQuickSetupService already resolves this class, so keeping the class
 * name avoids touching onboarding authority while V3 supplies the stricter
 * consistency-first image pipeline.
 */
class PmdStarterMenuImageServiceV2 extends PmdStarterMenuImageServiceV3
{
}
