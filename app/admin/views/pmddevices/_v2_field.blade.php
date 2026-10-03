@php
    $pmdRenderedField = '';
    try {
        if (!empty($pmdFormWidget) && !empty($pmdFieldName)) {
            $pmdFieldObject = $pmdFormWidget->getField($pmdFieldName);
            if ($pmdFieldObject) {
                $pmdExistingClass = isset($pmdFieldObject->cssClass) ? (string)$pmdFieldObject->cssClass : '';
                $pmdFieldObject->cssClass = trim($pmdExistingClass.' pmd-device-field '.($pmdFieldClass ?? ''));
                $pmdRenderedField = $pmdFormWidget->renderField($pmdFieldObject);
            }
        }
    } catch (\Throwable $pmdFieldError) {
        $pmdRenderedField = '';
    }
@endphp
{!! $pmdRenderedField !!}
