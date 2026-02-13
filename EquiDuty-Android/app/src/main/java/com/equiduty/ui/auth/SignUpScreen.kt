package com.equiduty.ui.auth

import androidx.compose.animation.*
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.ClickableText
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.equiduty.R

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignUpScreen(
    isLoading: Boolean,
    error: String?,
    onSignUp: (
        email: String,
        password: String,
        firstName: String,
        lastName: String,
        organizationType: String?,
        organizationName: String?,
        contactEmail: String?,
        phoneNumber: String?
    ) -> Unit,
    onNavigateBack: () -> Unit,
    onClearError: () -> Unit
) {
    var currentStep by remember { mutableIntStateOf(1) }
    var organizationType by remember { mutableStateOf<String?>(null) }

    // Step 2 fields
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }

    // Business fields
    var organizationName by remember { mutableStateOf("") }
    var contactEmail by remember { mutableStateOf("") }
    var phoneNumber by remember { mutableStateOf("") }
    var showOrgNameError by remember { mutableStateOf(false) }
    var agreedToTerms by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val uriHandler = LocalUriHandler.current
    val isBusiness = organizationType == "business"

    val passwordsMatch = password == confirmPassword || confirmPassword.isEmpty()
    val canSubmit = firstName.isNotBlank() && lastName.isNotBlank() &&
            email.isNotBlank() && password.length >= 6 && password == confirmPassword &&
            (!isBusiness || organizationName.isNotBlank()) && agreedToTerms

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(stringResource(R.string.auth_signup)) },
                navigationIcon = {
                    IconButton(onClick = {
                        if (currentStep == 2) {
                            currentStep = 1
                        } else {
                            onNavigateBack()
                        }
                    }) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, stringResource(R.string.back))
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            // Step indicator
            Text(
                text = stringResource(R.string.signup_step_indicator, currentStep, 2),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 24.dp, vertical = 8.dp)
            )

            LinearProgressIndicator(
                progress = { currentStep / 2f },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp),
            )

            Spacer(modifier = Modifier.height(16.dp))

            AnimatedContent(
                targetState = currentStep,
                transitionSpec = {
                    if (targetState > initialState) {
                        slideInHorizontally { it } + fadeIn() togetherWith
                                slideOutHorizontally { -it } + fadeOut()
                    } else {
                        slideInHorizontally { -it } + fadeIn() togetherWith
                                slideOutHorizontally { it } + fadeOut()
                    }
                },
                label = "step_transition"
            ) { step ->
                when (step) {
                    1 -> StepOneContent(
                        selectedType = organizationType,
                        onTypeSelected = { type ->
                            organizationType = type
                            onClearError()
                            currentStep = 2
                        }
                    )
                    2 -> StepTwoContent(
                        isBusiness = isBusiness,
                        isLoading = isLoading,
                        error = error,
                        firstName = firstName,
                        lastName = lastName,
                        email = email,
                        password = password,
                        confirmPassword = confirmPassword,
                        passwordVisible = passwordVisible,
                        passwordsMatch = passwordsMatch,
                        canSubmit = canSubmit,
                        organizationName = organizationName,
                        contactEmail = contactEmail,
                        phoneNumber = phoneNumber,
                        showOrgNameError = showOrgNameError,
                        onFirstNameChange = { firstName = it; onClearError() },
                        onLastNameChange = { lastName = it; onClearError() },
                        onEmailChange = { email = it; onClearError() },
                        onPasswordChange = { password = it; onClearError() },
                        onConfirmPasswordChange = { confirmPassword = it; onClearError() },
                        onPasswordVisibilityToggle = { passwordVisible = !passwordVisible },
                        onOrganizationNameChange = { organizationName = it; showOrgNameError = false; onClearError() },
                        onContactEmailChange = { contactEmail = it; onClearError() },
                        onPhoneNumberChange = { phoneNumber = it; onClearError() },
                        onSubmit = {
                            if (isBusiness && organizationName.isBlank()) {
                                showOrgNameError = true
                            } else if (canSubmit) {
                                focusManager.clearFocus()
                                onSignUp(
                                    email, password, firstName, lastName,
                                    organizationType,
                                    if (isBusiness) organizationName else null,
                                    if (isBusiness && contactEmail.isNotBlank()) contactEmail else null,
                                    if (isBusiness && phoneNumber.isNotBlank()) phoneNumber else null
                                )
                            }
                        },
                        onNavigateBack = onNavigateBack
                    )
                }
            }
        }
    }
}

@Composable
private fun StepOneContent(
    selectedType: String?,
    onTypeSelected: (String) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Spacer(modifier = Modifier.height(24.dp))

        Text(
            text = stringResource(R.string.signup_how_will_you_use),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(8.dp))

        Text(
            text = stringResource(R.string.signup_choose_best_fit),
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center
        )

        Spacer(modifier = Modifier.height(32.dp))

        // Personal card
        OrganizationTypeCard(
            icon = Icons.Default.Person,
            title = stringResource(R.string.signup_personal_use),
            description = stringResource(R.string.signup_personal_description),
            isSelected = selectedType == "personal",
            onClick = { onTypeSelected("personal") }
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Business card
        OrganizationTypeCard(
            icon = Icons.Default.Business,
            title = stringResource(R.string.signup_stable_or_business),
            description = stringResource(R.string.signup_business_description),
            isSelected = selectedType == "business",
            onClick = { onTypeSelected("business") }
        )

        Spacer(modifier = Modifier.height(24.dp))
    }
}

@Composable
private fun OrganizationTypeCard(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    title: String,
    description: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    OutlinedCard(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        border = BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (isSelected) MaterialTheme.colorScheme.primary
            else MaterialTheme.colorScheme.outline
        ),
        colors = CardDefaults.outlinedCardColors(
            containerColor = if (isSelected)
                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.3f)
            else MaterialTheme.colorScheme.surface
        )
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(20.dp),
            verticalAlignment = Alignment.Top
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(32.dp),
                tint = if (isSelected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = description,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}

@Composable
private fun StepTwoContent(
    isBusiness: Boolean,
    isLoading: Boolean,
    error: String?,
    firstName: String,
    lastName: String,
    email: String,
    password: String,
    confirmPassword: String,
    passwordVisible: Boolean,
    passwordsMatch: Boolean,
    canSubmit: Boolean,
    organizationName: String,
    contactEmail: String,
    phoneNumber: String,
    showOrgNameError: Boolean,
    onFirstNameChange: (String) -> Unit,
    onLastNameChange: (String) -> Unit,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onConfirmPasswordChange: (String) -> Unit,
    onPasswordVisibilityToggle: () -> Unit,
    onOrganizationNameChange: (String) -> Unit,
    onContactEmailChange: (String) -> Unit,
    onPhoneNumberChange: (String) -> Unit,
    onSubmit: () -> Unit,
    onNavigateBack: () -> Unit
) {
    val focusManager = LocalFocusManager.current

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        if (error != null) {
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.errorContainer
                ),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    modifier = Modifier.padding(16.dp),
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
        }

        OutlinedTextField(
            value = firstName,
            onValueChange = onFirstNameChange,
            label = { Text(stringResource(R.string.auth_first_name)) },
            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = lastName,
            onValueChange = onLastNameChange,
            label = { Text(stringResource(R.string.auth_last_name)) },
            leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = email,
            onValueChange = onEmailChange,
            label = { Text(stringResource(R.string.auth_email)) },
            leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next
            ),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) }
            ),
            singleLine = true,
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = password,
            onValueChange = onPasswordChange,
            label = { Text(stringResource(R.string.auth_password)) },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
            trailingIcon = {
                IconButton(onClick = onPasswordVisibilityToggle) {
                    Icon(
                        if (passwordVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                        contentDescription = null
                    )
                }
            },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = ImeAction.Next
            ),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) }
            ),
            singleLine = true,
            supportingText = {
                if (password.isNotEmpty() && password.length < 6) {
                    Text(stringResource(R.string.password_min_length), color = MaterialTheme.colorScheme.error)
                }
            },
            modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedTextField(
            value = confirmPassword,
            onValueChange = onConfirmPasswordChange,
            label = { Text(stringResource(R.string.auth_confirm_password)) },
            leadingIcon = { Icon(Icons.Default.Lock, contentDescription = null) },
            visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Password,
                imeAction = if (isBusiness) ImeAction.Next else ImeAction.Done
            ),
            keyboardActions = KeyboardActions(
                onNext = { focusManager.moveFocus(FocusDirection.Down) },
                onDone = {
                    focusManager.clearFocus()
                    if (canSubmit) onSubmit()
                }
            ),
            singleLine = true,
            isError = !passwordsMatch,
            supportingText = {
                if (!passwordsMatch) {
                    Text(stringResource(R.string.password_mismatch), color = MaterialTheme.colorScheme.error)
                }
            },
            modifier = Modifier.fillMaxWidth()
        )

        // Business fields
        if (isBusiness) {
            Spacer(modifier = Modifier.height(20.dp))

            Text(
                text = stringResource(R.string.signup_business_details_title),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.fillMaxWidth()
            )

            Text(
                text = stringResource(R.string.signup_business_details_subtitle),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = organizationName,
                onValueChange = onOrganizationNameChange,
                label = { Text(stringResource(R.string.signup_organization_name)) },
                leadingIcon = { Icon(Icons.Default.Business, contentDescription = null) },
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                singleLine = true,
                isError = showOrgNameError,
                supportingText = {
                    if (showOrgNameError) {
                        Text(stringResource(R.string.signup_org_name_required), color = MaterialTheme.colorScheme.error)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = contactEmail,
                onValueChange = onContactEmailChange,
                label = { Text(stringResource(R.string.signup_contact_email)) },
                leadingIcon = { Icon(Icons.Default.Email, contentDescription = null) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next
                ),
                keyboardActions = KeyboardActions(
                    onNext = { focusManager.moveFocus(FocusDirection.Down) }
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(12.dp))

            OutlinedTextField(
                value = phoneNumber,
                onValueChange = onPhoneNumberChange,
                label = { Text(stringResource(R.string.signup_phone_number)) },
                leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                keyboardOptions = KeyboardOptions(
                    keyboardType = KeyboardType.Phone,
                    imeAction = ImeAction.Done
                ),
                keyboardActions = KeyboardActions(
                    onDone = {
                        focusManager.clearFocus()
                        if (canSubmit) onSubmit()
                    }
                ),
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        // Terms and conditions checkbox
        Row(
            verticalAlignment = Alignment.Top,
            modifier = Modifier.fillMaxWidth()
        ) {
            Checkbox(
                checked = agreedToTerms,
                onCheckedChange = { agreedToTerms = it }
            )
            Spacer(modifier = Modifier.width(4.dp))
            val privacyText = stringResource(R.string.signup_privacy_policy)
            val termsText = stringResource(R.string.signup_terms_of_service)
            val agreeText = stringResource(R.string.signup_agree_to)
            val andText = stringResource(R.string.signup_and)
            val fullText = "$agreeText $privacyText $andText $termsText"
            val annotatedString = buildAnnotatedString {
                append("$agreeText ")
                val privacyStart = length
                pushStringAnnotation(tag = "URL", annotation = "https://equiduty.se/privacy")
                withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline)) {
                    append(privacyText)
                }
                pop()
                append(" $andText ")
                pushStringAnnotation(tag = "URL", annotation = "https://equiduty.se/terms")
                withStyle(SpanStyle(color = MaterialTheme.colorScheme.primary, textDecoration = TextDecoration.Underline)) {
                    append(termsText)
                }
                pop()
            }
            ClickableText(
                text = annotatedString,
                style = MaterialTheme.typography.bodySmall.copy(
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                ),
                onClick = { offset ->
                    annotatedString.getStringAnnotations(tag = "URL", start = offset, end = offset)
                        .firstOrNull()?.let { annotation ->
                            uriHandler.openUri(annotation.item)
                        }
                },
                modifier = Modifier.padding(top = 12.dp)
            )
        }

        Spacer(modifier = Modifier.height(16.dp))

        Button(
            onClick = onSubmit,
            enabled = !isLoading && canSubmit,
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    modifier = Modifier.size(20.dp),
                    strokeWidth = 2.dp,
                    color = MaterialTheme.colorScheme.onPrimary
                )
            } else {
                Text(stringResource(R.string.auth_signup), fontSize = 16.sp)
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = stringResource(R.string.auth_has_account),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            TextButton(onClick = onNavigateBack) {
                Text(stringResource(R.string.auth_login))
            }
        }

        Spacer(modifier = Modifier.height(24.dp))
    }
}
