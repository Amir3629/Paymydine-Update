<?php

namespace Admin\Requests;

use System\Classes\FormRequest;

class ReviewSocialSettings extends FormRequest
{
    public function authorize()
    {
        return true;
    }

    public function rules()
    {
        return [
            'pmd_review_share_prompt_enabled' => ['nullable'],
            'pmd_home_social_icons_enabled' => ['nullable'],

            'pmd_social_instagram_enabled' => ['nullable'],
            'pmd_social_instagram_url' => ['nullable', 'string', 'max:500'],

            'pmd_social_google_enabled' => ['nullable'],
            'pmd_social_google_url' => ['nullable', 'string', 'max:500'],

            'pmd_social_trustpilot_enabled' => ['nullable'],
            'pmd_social_trustpilot_url' => ['nullable', 'string', 'max:500'],

            'pmd_social_reviews_enabled' => ['nullable'],
            'pmd_social_reviews_url' => ['nullable', 'string', 'max:500'],

            'pmd_social_website_enabled' => ['nullable'],
            'pmd_social_website_url' => ['nullable', 'string', 'max:500'],
        ];
    }
}
