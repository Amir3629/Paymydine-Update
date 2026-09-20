<?php
$status = (array)($pmdGoogleBusiness ?? []);
$locations = (array)($pmdGoogleLocations ?? []);
$error = $pmdGoogleError ?? null;
?>

<div class="container-fluid" style="max-width:1180px;margin:0 auto;padding:24px;">
    <div class="page-header" style="margin-bottom:24px;">
        <h1>Choose Google Business Profile</h1>
        <p class="text-muted">
            Choose the Google location that belongs to this PayMyDine restaurant.
            Reviews, rating and the official Google review link will be synchronized from this location.
        </p>
        <a href="<?= admin_url('pmdsettings/restaurant') ?>" class="btn btn-default">Back to Restaurant settings</a>
    </div>

    <?php if ($error): ?>
        <div class="alert alert-danger">
            <strong>Google connection error:</strong>
            <?= e($error) ?>
        </div>
    <?php endif; ?>

    <?php if (empty($locations)): ?>
        <div class="panel panel-default">
            <div class="panel-body">
                <h4>No Google Business locations were returned.</h4>
                <p class="text-muted mb-0">
                    Make sure the Google account you connected manages a verified Business Profile and that
                    PayMyDine's Google Business Profile API access is enabled.
                </p>
            </div>
        </div>
    <?php else: ?>
        <div class="row">
            <?php foreach ($locations as $location): ?>
                <?php
                    $selected = !empty($status['google_location_name'])
                        && hash_equals((string)$status['google_location_name'], (string)$location['location_name']);
                ?>
                <div class="col-md-6" style="margin-bottom:18px;">
                    <div class="panel <?= $selected ? 'panel-success' : 'panel-default' ?>" style="height:100%;">
                        <div class="panel-heading">
                            <strong><?= e($location['title'] ?: $location['location_name']) ?></strong>
                            <?php if ($selected): ?>
                                <span class="label label-success pull-right">Connected</span>
                            <?php endif; ?>
                        </div>
                        <div class="panel-body">
                            <?php if (!empty($location['account_display_name'])): ?>
                                <p><strong>Account:</strong> <?= e($location['account_display_name']) ?></p>
                            <?php endif; ?>
                            <?php if (!empty($location['address'])): ?>
                                <p><strong>Address:</strong> <?= e($location['address']) ?></p>
                            <?php endif; ?>
                            <?php if (!empty($location['place_id'])): ?>
                                <p><strong>Place ID:</strong> <code><?= e($location['place_id']) ?></code></p>
                            <?php endif; ?>
                            <?php if (!empty($location['website_uri'])): ?>
                                <p><strong>Website:</strong> <?= e($location['website_uri']) ?></p>
                            <?php endif; ?>

                            <form method="POST" action="<?= admin_url('pmdgooglebusiness/selectlocation') ?>">
                                <input type="hidden" name="_token" value="<?= e(csrf_token()) ?>">
                                <input type="hidden" name="account_name" value="<?= e($location['account_name']) ?>">
                                <input type="hidden" name="location_name" value="<?= e($location['location_name']) ?>">
                                <button type="submit" class="btn btn-primary">
                                    <?= $selected ? 'Reconnect this location' : 'Connect this location' ?>
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>
