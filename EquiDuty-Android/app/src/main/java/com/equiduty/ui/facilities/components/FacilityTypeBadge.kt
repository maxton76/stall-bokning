package com.equiduty.ui.facilities.components

import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.equiduty.R
import com.equiduty.domain.model.FacilityType

@Composable
fun FacilityTypeBadge(type: FacilityType, modifier: Modifier = Modifier) {
    Surface(
        color = MaterialTheme.colorScheme.secondaryContainer,
        shape = RoundedCornerShape(4.dp),
        modifier = modifier
    ) {
        Text(
            text = facilityTypeLabel(type),
            color = MaterialTheme.colorScheme.onSecondaryContainer,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
        )
    }
}

@Composable
fun facilityTypeLabel(type: FacilityType): String = when (type) {
    FacilityType.INDOOR_ARENA -> stringResource(R.string.facility_type_indoor_arena)
    FacilityType.OUTDOOR_ARENA -> stringResource(R.string.facility_type_outdoor_arena)
    FacilityType.WALKER -> stringResource(R.string.facility_type_walker)
    FacilityType.SOLARIUM -> stringResource(R.string.facility_type_solarium)
    FacilityType.WASH_STALL -> stringResource(R.string.facility_type_wash_stall)
    FacilityType.PADDOCK -> stringResource(R.string.facility_type_paddock)
    FacilityType.LUNGING_RING -> stringResource(R.string.facility_type_lunging_ring)
    FacilityType.TREADMILL -> stringResource(R.string.facility_type_treadmill)
    FacilityType.WATER_TREADMILL -> stringResource(R.string.facility_type_water_treadmill)
    FacilityType.GALLOPING_TRACK -> stringResource(R.string.facility_type_galloping_track)
    FacilityType.JUMPING_YARD -> stringResource(R.string.facility_type_jumping_yard)
    FacilityType.VIBRATION_PLATE -> stringResource(R.string.facility_type_vibration_plate)
    FacilityType.PASTURE -> stringResource(R.string.facility_type_pasture)
    FacilityType.TRANSPORT -> stringResource(R.string.facility_type_transport)
    FacilityType.OTHER -> stringResource(R.string.facility_type_other)
}
