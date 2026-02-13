package com.equiduty.ui.featurerequests.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.equiduty.R
import com.equiduty.domain.model.FeatureRequestCategory

@Composable
fun CategoryBadge(category: FeatureRequestCategory, modifier: Modifier = Modifier) {
    val (backgroundColor, textColor, labelRes) = when (category) {
        FeatureRequestCategory.IMPROVEMENT -> Triple(Color(0xFFCCFBF1), Color(0xFF0F766E), R.string.fr_category_improvement)
        FeatureRequestCategory.NEW_FEATURE -> Triple(Color(0xFFE0E7FF), Color(0xFF4338CA), R.string.fr_category_new_feature)
        FeatureRequestCategory.INTEGRATION -> Triple(Color(0xFFD1FAE5), Color(0xFF047857), R.string.fr_category_integration)
        FeatureRequestCategory.BUG_FIX -> Triple(Color(0xFFFCE7F3), Color(0xFFBE185D), R.string.fr_category_bug_fix)
        FeatureRequestCategory.OTHER -> Triple(Color(0xFFF3F4F6), Color(0xFF4B5563), R.string.fr_category_other)
    }

    Surface(
        color = backgroundColor,
        shape = RoundedCornerShape(12.dp),
        modifier = modifier
    ) {
        Text(
            text = stringResource(labelRes),
            color = textColor,
            style = MaterialTheme.typography.labelSmall,
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
        )
    }
}
