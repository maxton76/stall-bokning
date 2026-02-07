package com.equiduty.ui.horses

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.equiduty.domain.model.HorseOwnership
import com.equiduty.domain.model.TeamMember
import com.equiduty.ui.components.EmptyStateView

@Composable
fun HorseTeamTab(viewModel: HorseDetailViewModel) {
    val team by viewModel.team.collectAsState()
    val ownerships by viewModel.ownerships.collectAsState()
    val horse by viewModel.horse.collectAsState()

    val displayTeam = team ?: horse?.team
    val members = displayTeam?.allMembers ?: emptyList()

    if (members.isEmpty() && ownerships.isEmpty()) {
        EmptyStateView(
            icon = Icons.Default.Group,
            title = "Inget team",
            message = "Inga teammedlemmar har tilldelats"
        )
    } else {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(16.dp)
        ) {
            if (members.isNotEmpty()) {
                Text(
                    text = "Teammedlemmar",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                members.forEach { member ->
                    TeamMemberCard(member)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            if (ownerships.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text(
                    text = "Ägare",
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
                ownerships.forEach { ownership ->
                    OwnershipCard(ownership)
                    Spacer(modifier = Modifier.height(8.dp))
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun TeamMemberCard(member: TeamMember) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Row(modifier = Modifier.padding(16.dp)) {
            Icon(
                Icons.Default.Person,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column {
                Text(member.name, style = MaterialTheme.typography.titleSmall)
                Text(
                    text = member.role.value,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                member.phone?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
                member.email?.let {
                    Text(it, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun OwnershipCard(ownership: HorseOwnership) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = ownership.ownerName,
                style = MaterialTheme.typography.titleSmall
            )
            Text(
                text = ownership.role.value,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Text(
                text = "Ägarandel: ${ownership.percentage}%",
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}
