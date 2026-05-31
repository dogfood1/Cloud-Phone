package com.yiyi.cloud_phone;

import android.content.Context;
import android.view.View;
import android.widget.ImageView;
import android.widget.TextView;

final class SettingsSectionUi {
    private SettingsSectionUi() {
    }

    static void decorate(View root) {
        Context context = root.getContext();
        bindSection(
                root.findViewById(R.id.sectionAccount),
                context,
                R.string.settings_section_account_title,
                R.string.settings_section_account_desc,
                AppIcons::settingsAccount
        );
        bindSection(
                root.findViewById(R.id.sectionAppearance),
                context,
                R.string.settings_section_appearance_title,
                R.string.settings_section_appearance_desc,
                AppIcons::settingsAppearance
        );
        bindSection(
                root.findViewById(R.id.sectionRefresh),
                context,
                R.string.settings_section_refresh_title,
                R.string.settings_section_refresh_desc,
                AppIcons::settingsRefresh
        );
        bindSection(
                root.findViewById(R.id.sectionServer),
                context,
                R.string.settings_server_title,
                R.string.settings_section_server_desc,
                AppIcons::settingsServer
        );
    }

    private static void bindSection(
            View section,
            Context context,
            int titleRes,
            int descRes,
            IconSupplier iconSupplier
    ) {
        if (section == null) {
            return;
        }
        TextView title = section.findViewById(R.id.textSectionTitle);
        TextView desc = section.findViewById(R.id.textSectionDesc);
        ImageView icon = section.findViewById(R.id.imageSectionIcon);
        if (title != null) {
            title.setText(titleRes);
        }
        if (desc != null) {
            desc.setText(descRes);
        }
        if (icon != null) {
            icon.setImageDrawable(iconSupplier.get(context));
        }
    }

    private interface IconSupplier {
        com.mikepenz.iconics.IconicsDrawable get(Context context);
    }
}
