<?php

namespace Admin\Services;

/**
 * Compatibility alias for the original Quick Setup integration point.
 *
 * PmdTenantQuickSetupService resolves this class, so the stable class name is
 * kept while V4 supplies the stricter dish-aware + consistency-first pipeline.
 */
class PmdStarterMenuImageServiceV2 extends PmdStarterMenuImageServiceV4
{
}
