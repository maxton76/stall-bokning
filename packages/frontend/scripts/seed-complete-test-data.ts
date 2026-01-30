/**
 * Comprehensive Firestore Test Data Seed Script
 *
 * Creates realistic, interconnected test data for all 20 Firestore collections
 * following the organization-centric architecture patterns found in the codebase.
 *
 * Usage:
 *   FIRESTORE_EMULATOR_HOST=localhost:5081 npx tsx scripts/seed-complete-test-data.ts
 *
 * Total Documents: ~245 across 20 collections
 */

import dotenv from "dotenv";
import admin from "firebase-admin";

const { Timestamp } = admin.firestore;
import {
  addDays,
  subDays,
  addHours,
  addMonths,
  subWeeks,
  subMonths,
} from "date-fns";

// Load environment variables
dotenv.config({ path: ".env.local" });

// Set emulator host BEFORE importing firebase-admin
if (
  process.env.VITE_USE_FIREBASE_EMULATOR === "true" ||
  process.env.FIRESTORE_EMULATOR_HOST
) {
  process.env.FIRESTORE_EMULATOR_HOST =
    process.env.FIRESTORE_EMULATOR_HOST || "localhost:5081";
  console.log(
    "🔧 Connecting to Firestore Emulator at",
    process.env.FIRESTORE_EMULATOR_HOST,
  );
}

// Initialize Firebase Admin
const projectId = process.env.VITE_FIREBASE_PROJECT_ID || "equiduty-dev";

if (!admin.apps.length) {
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

//============================================================================
// Constants & IDs
//============================================================================

const USER_IDS = {
  ALICE: "user_alice",
  BOB: "user_bob",
  CAROL: "user_carol",
  DAVID: "user_david",
  EMMA: "user_emma",
  FRANK: "user_frank",
  GRACE: "user_grace",
};

const ORG_IDS = {
  SUNNYDALE: "org_sunnydale",
  GREENFIELD: "org_greenfield",
};

const STABLE_IDS = {
  MAIN_BARN: "stable_main",
  TRAINING: "stable_training",
  GREENFIELD_BARN: "stable_greenfield",
};

const HORSE_IDS = {
  THUNDER: "horse_thunder",
  LIGHTNING: "horse_lightning",
  STORM: "horse_storm",
  BLAZE: "horse_blaze",
  STAR: "horse_star",
  DUSTY: "horse_dusty",
  RAVEN: "horse_raven",
  PHOENIX: "horse_phoenix",
  SPIRIT: "horse_spirit",
  COMET: "horse_comet",
  MIDNIGHT: "horse_midnight",
  SHADOW: "horse_shadow",
};

const GROUP_IDS = {
  COMPETITION: "group_competition",
  TRAINING: "group_training",
  BREEDING: "group_breeding",
  RETIRED: "group_retired",
};

const FACILITY_IDS = {
  INDOOR_ARENA: "facility_indoor",
  OUTDOOR_ARENA: "facility_outdoor",
  WALKER: "facility_walker",
  PADDOCK: "facility_paddock",
  SOLARIUM: "facility_solarium",
  TREADMILL: "facility_treadmill",
};

//============================================================================
// Phase 1: Foundation (users, vaccinationRules, contacts)
//============================================================================

async function seedUsers() {
  console.log("\n📝 Phase 1.1: Seeding users (7)...");
  const batch = db.batch();

  const users = [
    {
      id: USER_IDS.ALICE,
      email: "alice@sunnydale.com",
      firstName: "Alice",
      lastName: "Johnson",
      phoneNumber: "+46701234567",
      systemRole: "stable_owner",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.BOB,
      email: "bob@sunnydale.com",
      firstName: "Bob",
      lastName: "Williams",
      phoneNumber: "+46701234568",
      systemRole: "stable_owner",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.CAROL,
      email: "carol@vet.com",
      firstName: "Carol",
      lastName: "Martinez",
      phoneNumber: "+46701234569",
      systemRole: "service_provider",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.DAVID,
      email: "david@example.com",
      firstName: "David",
      lastName: "Chen",
      phoneNumber: "+46701234570",
      systemRole: "stable_user",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.EMMA,
      email: "emma@greenfield.com",
      firstName: "Emma",
      lastName: "Thompson",
      phoneNumber: "+46701234571",
      systemRole: "stable_owner",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.FRANK,
      email: "frank@example.com",
      firstName: "Frank",
      lastName: "Garcia",
      phoneNumber: "+46701234572",
      systemRole: "stable_user",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 1)),
      updatedAt: Timestamp.now(),
    },
    {
      id: USER_IDS.GRACE,
      email: "grace@example.com",
      firstName: "Grace",
      lastName: "Lee",
      phoneNumber: null,
      systemRole: "stable_user",
      createdAt: Timestamp.fromDate(subWeeks(new Date(), 2)),
      updatedAt: Timestamp.now(),
    },
  ];

  users.forEach((user) => {
    batch.set(db.collection("users").doc(user.id), user);
  });

  await batch.commit();
  console.log(`   ✅ Created ${users.length} users`);
}

async function seedVaccinationRules() {
  console.log("\n📝 Phase 1.2: Seeding vaccination rules (4)...");
  const batch = db.batch();

  const rules = [
    {
      id: "system-fei",
      scope: "system",
      systemWide: true,
      name: "FEI rules",
      description:
        "Horse has to be vaccinated within 6 months and 21 days and cannot compete for 7 days.",
      periodMonths: 6,
      periodDays: 21,
      daysNotCompeting: 7,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
    },
    {
      id: "system-knhs",
      scope: "system",
      systemWide: true,
      name: "KNHS rules",
      description:
        "Horse has to be vaccinated within 12 months and 0 days and cannot compete for 7 days.",
      periodMonths: 12,
      periodDays: 0,
      daysNotCompeting: 7,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: "system",
    },
    {
      id: "rule_custom_org1",
      scope: "organization",
      organizationId: ORG_IDS.SUNNYDALE,
      name: "Sunnydale Custom",
      description: "Custom vaccination rule for Sunnydale Stables",
      periodMonths: 9,
      periodDays: 0,
      daysNotCompeting: 5,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: "rule_custom_user",
      scope: "user",
      userId: USER_IDS.DAVID,
      name: "David's Custom Rule",
      description: "Personal vaccination schedule for breeding horses",
      periodMonths: 8,
      periodDays: 0,
      daysNotCompeting: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
  ];

  rules.forEach((rule) => {
    batch.set(db.collection("vaccinationRules").doc(rule.id), rule);
  });

  await batch.commit();
  console.log(`   ✅ Created ${rules.length} vaccination rules`);
}

async function seedContacts() {
  console.log("\n📝 Phase 1.3: Seeding contacts (8)...");
  const batch = db.batch();

  const contacts = [
    // Personal contacts (4)
    {
      contactType: "Personal",
      accessLevel: "organization",
      organizationId: ORG_IDS.SUNNYDALE,
      firstName: "Dr. Sarah",
      lastName: "Veterinary",
      email: "sarah@vetcharity.com",
      phoneNumber: "+46701111111",
      address: {
        street: "Vet Street 1",
        postalCode: "12345",
        city: "Stockholm",
        country: "Sweden",
      },
      invoiceLanguage: "en",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      contactType: "Personal",
      accessLevel: "organization",
      organizationId: ORG_IDS.SUNNYDALE,
      firstName: "John",
      lastName: "Farrier",
      email: "john@farrier.com",
      phoneNumber: "+46702222222",
      address: {
        street: "Forge Road 2",
        postalCode: "23456",
        city: "Uppsala",
        country: "Sweden",
      },
      invoiceLanguage: "sv",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.BOB,
    },
    {
      contactType: "Personal",
      accessLevel: "user",
      userId: USER_IDS.DAVID,
      firstName: "Maria",
      lastName: "Trainer",
      email: "maria@training.com",
      phoneNumber: "+46703333333",
      address: {
        street: "Training Lane 3",
        postalCode: "34567",
        city: "Malmö",
        country: "Sweden",
      },
      invoiceLanguage: "en",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
    {
      contactType: "Personal",
      accessLevel: "organization",
      organizationId: ORG_IDS.GREENFIELD,
      firstName: "Dr. Emma",
      lastName: "Dentist",
      email: "emma@horsedentist.com",
      phoneNumber: "+46704444444",
      address: {
        street: "Dental Street 4",
        postalCode: "45678",
        city: "Gothenburg",
        country: "Sweden",
      },
      invoiceLanguage: "sv",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.EMMA,
    },
    // Business contacts (4)
    {
      contactType: "Business",
      accessLevel: "organization",
      organizationId: ORG_IDS.SUNNYDALE,
      businessName: "Premium Horse Feed AB",
      companyRegistrationNumber: "556123-4567",
      vatNumber: "SE556123456701",
      email: "sales@horsefeed.se",
      phoneNumber: "+46705555555",
      address: {
        street: "Business Park 1",
        postalCode: "56789",
        city: "Stockholm",
        country: "Sweden",
      },
      contactPerson: {
        name: "Sales Manager",
        email: "manager@horsefeed.se",
        phone: "+46705555556",
      },
      invoiceLanguage: "sv",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      contactType: "Business",
      accessLevel: "organization",
      organizationId: ORG_IDS.SUNNYDALE,
      businessName: "Equine Insurance Sweden",
      companyRegistrationNumber: "556234-5678",
      vatNumber: "SE556234567801",
      email: "info@equineinsurance.se",
      phoneNumber: "+46706666666",
      address: {
        street: "Insurance Road 2",
        postalCode: "67890",
        city: "Uppsala",
        country: "Sweden",
      },
      invoiceLanguage: "en",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.BOB,
    },
    {
      contactType: "Business",
      accessLevel: "organization",
      organizationId: ORG_IDS.GREENFIELD,
      businessName: "Stable Supplies Nordic AB",
      companyRegistrationNumber: "556345-6789",
      vatNumber: "SE556345678901",
      email: "orders@stablesupplies.se",
      phoneNumber: "+46707777777",
      address: {
        street: "Supply Street 3",
        postalCode: "78901",
        city: "Malmö",
        country: "Sweden",
      },
      invoiceLanguage: "sv",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.EMMA,
    },
    {
      contactType: "Business",
      accessLevel: "user",
      userId: USER_IDS.DAVID,
      businessName: "Breeding Consultants International",
      companyRegistrationNumber: "556456-7890",
      vatNumber: "SE556456789001",
      email: "contact@breedingconsultants.com",
      phoneNumber: "+46708888888",
      address: {
        street: "Consultant Ave 4",
        postalCode: "89012",
        city: "Gothenburg",
        country: "Sweden",
      },
      invoiceLanguage: "en",
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
  ];

  contacts.forEach((contact, index) => {
    const docRef = db.collection("contacts").doc();
    batch.set(docRef, { ...contact, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${contacts.length} contacts`);
}

//============================================================================
// Phase 2: Organizations (organizations, organizationMembers, invites)
//============================================================================

async function seedOrganizations() {
  console.log("\n📝 Phase 2.1: Seeding organizations (2)...");
  const batch = db.batch();

  const organizations = [
    {
      id: ORG_IDS.SUNNYDALE,
      name: "Sunnydale Stables",
      description:
        "Professional equestrian facility with multiple barns and training facilities",
      contactType: "Business",
      primaryEmail: "info@sunnydale.com",
      phoneNumber: "+46701234567",
      timezone: "Europe/Stockholm",
      ownerId: USER_IDS.ALICE,
      ownerEmail: "alice@sunnydale.com",
      subscriptionTier: "professional",
      stats: {
        stableCount: 0, // Will be updated when stables are created
        totalMemberCount: 0, // Will be updated when members are added
      },
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      updatedAt: Timestamp.now(),
    },
    {
      id: ORG_IDS.GREENFIELD,
      name: "Greenfield Equestrian",
      description: "Family-run stable with focus on recreational riding",
      contactType: "Personal",
      primaryEmail: "emma@greenfield.com",
      phoneNumber: "+46701234571",
      timezone: "Europe/Stockholm",
      ownerId: USER_IDS.EMMA,
      ownerEmail: "emma@greenfield.com",
      subscriptionTier: "free",
      stats: {
        stableCount: 0,
        totalMemberCount: 0,
      },
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
    },
  ];

  organizations.forEach((org) => {
    batch.set(db.collection("organizations").doc(org.id), org);
  });

  await batch.commit();
  console.log(`   ✅ Created ${organizations.length} organizations`);
}

async function seedOrganizationMembers() {
  console.log("\n📝 Phase 2.2: Seeding organizationMembers (9)...");
  const batch = db.batch();

  const members = [
    // Sunnydale members
    {
      id: `${USER_IDS.ALICE}_${ORG_IDS.SUNNYDALE}`,
      organizationId: ORG_IDS.SUNNYDALE,
      userId: USER_IDS.ALICE,
      userEmail: "alice@sunnydale.com",
      firstName: "Alice",
      lastName: "Johnson",
      phoneNumber: "+46701234567",
      roles: ["administrator"],
      primaryRole: "administrator",
      status: "active",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      invitedBy: "system",
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 6)),
    },
    {
      id: `${USER_IDS.BOB}_${ORG_IDS.SUNNYDALE}`,
      organizationId: ORG_IDS.SUNNYDALE,
      userId: USER_IDS.BOB,
      userEmail: "bob@sunnydale.com",
      firstName: "Bob",
      lastName: "Williams",
      phoneNumber: "+46701234568",
      roles: ["administrator", "veterinarian"],
      primaryRole: "administrator",
      status: "active",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      invitedBy: USER_IDS.ALICE,
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 5)),
    },
    {
      id: `${USER_IDS.CAROL}_${ORG_IDS.SUNNYDALE}`,
      organizationId: ORG_IDS.SUNNYDALE,
      userId: USER_IDS.CAROL,
      userEmail: "carol@vet.com",
      firstName: "Carol",
      lastName: "Martinez",
      phoneNumber: "+46701234569",
      roles: ["veterinarian"],
      primaryRole: "veterinarian",
      status: "active",
      showInPlanning: false,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      invitedBy: USER_IDS.ALICE,
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 4)),
    },
    {
      id: `${USER_IDS.DAVID}_${ORG_IDS.SUNNYDALE}`,
      organizationId: ORG_IDS.SUNNYDALE,
      userId: USER_IDS.DAVID,
      userEmail: "david@example.com",
      firstName: "David",
      lastName: "Chen",
      phoneNumber: "+46701234570",
      roles: ["customer", "horse_owner"],
      primaryRole: "horse_owner",
      status: "active",
      showInPlanning: false,
      stableAccess: "specific",
      assignedStableIds: [STABLE_IDS.MAIN_BARN],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      invitedBy: USER_IDS.ALICE,
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 3)),
    },
    // Greenfield members
    {
      id: `${USER_IDS.EMMA}_${ORG_IDS.GREENFIELD}`,
      organizationId: ORG_IDS.GREENFIELD,
      userId: USER_IDS.EMMA,
      userEmail: "emma@greenfield.com",
      firstName: "Emma",
      lastName: "Thompson",
      phoneNumber: "+46701234571",
      roles: ["administrator"],
      primaryRole: "administrator",
      status: "active",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      invitedBy: "system",
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 2)),
    },
    {
      id: `${USER_IDS.FRANK}_${ORG_IDS.GREENFIELD}`,
      organizationId: ORG_IDS.GREENFIELD,
      userId: USER_IDS.FRANK,
      userEmail: "frank@example.com",
      firstName: "Frank",
      lastName: "Garcia",
      phoneNumber: "+46701234572",
      roles: ["horse_owner"],
      primaryRole: "horse_owner",
      status: "active",
      showInPlanning: false,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 1)),
      invitedBy: USER_IDS.EMMA,
      inviteAcceptedAt: Timestamp.fromDate(subMonths(new Date(), 1)),
    },
    {
      id: `${USER_IDS.GRACE}_${ORG_IDS.GREENFIELD}`,
      organizationId: ORG_IDS.GREENFIELD,
      userId: USER_IDS.GRACE,
      userEmail: "grace@example.com",
      firstName: "Grace",
      lastName: "Lee",
      phoneNumber: null,
      roles: ["groom"],
      primaryRole: "groom",
      status: "active",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subWeeks(new Date(), 2)),
      invitedBy: USER_IDS.EMMA,
      inviteAcceptedAt: Timestamp.fromDate(subWeeks(new Date(), 2)),
    },
    // Cross-organization memberships (David also in Greenfield, Bob's personal org)
    {
      id: `${USER_IDS.DAVID}_${ORG_IDS.GREENFIELD}`,
      organizationId: ORG_IDS.GREENFIELD,
      userId: USER_IDS.DAVID,
      userEmail: "david@example.com",
      firstName: "David",
      lastName: "Chen",
      phoneNumber: "+46701234570",
      roles: ["customer"],
      primaryRole: "customer",
      status: "active",
      showInPlanning: false,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subWeeks(new Date(), 4)),
      invitedBy: USER_IDS.EMMA,
      inviteAcceptedAt: Timestamp.fromDate(subWeeks(new Date(), 4)),
    },
    {
      id: `${USER_IDS.BOB}_${ORG_IDS.GREENFIELD}`,
      organizationId: ORG_IDS.GREENFIELD,
      userId: USER_IDS.BOB,
      userEmail: "bob@sunnydale.com",
      firstName: "Bob",
      lastName: "Williams",
      phoneNumber: "+46701234568",
      roles: ["veterinarian"],
      primaryRole: "veterinarian",
      status: "active",
      showInPlanning: false,
      stableAccess: "all",
      assignedStableIds: [],
      joinedAt: Timestamp.fromDate(subWeeks(new Date(), 3)),
      invitedBy: USER_IDS.EMMA,
      inviteAcceptedAt: Timestamp.fromDate(subWeeks(new Date(), 3)),
    },
  ];

  members.forEach((member) => {
    batch.set(db.collection("organizationMembers").doc(member.id), member);
  });

  await batch.commit();
  console.log(`   ✅ Created ${members.length} organization members`);

  // Update organization stats
  await db.collection("organizations").doc(ORG_IDS.SUNNYDALE).update({
    "stats.totalMemberCount": 4,
  });
  await db.collection("organizations").doc(ORG_IDS.GREENFIELD).update({
    "stats.totalMemberCount": 5,
  });
  console.log("   ✅ Updated organization member counts");
}

async function seedInvites() {
  console.log("\n📝 Phase 2.3: Seeding invites (2)...");
  const batch = db.batch();

  const invites = [
    {
      organizationId: ORG_IDS.SUNNYDALE,
      email: "pending@example.com",
      firstName: "Pending",
      lastName: "User",
      phoneNumber: "+46709999999",
      roles: ["customer"],
      primaryRole: "customer",
      showInPlanning: false,
      stableAccess: "specific",
      assignedStableIds: [STABLE_IDS.MAIN_BARN],
      token: "invite-token-12345",
      status: "pending",
      expiresAt: Timestamp.fromDate(addDays(new Date(), 7)),
      invitedBy: USER_IDS.ALICE,
      invitedAt: Timestamp.now(),
      organizationName: "Sunnydale Stables",
      inviterName: "Alice Johnson",
    },
    {
      organizationId: ORG_IDS.GREENFIELD,
      email: "expired@example.com",
      firstName: null,
      lastName: null,
      phoneNumber: null,
      roles: ["rider"],
      primaryRole: "rider",
      showInPlanning: true,
      stableAccess: "all",
      assignedStableIds: [],
      token: "invite-token-67890",
      status: "expired",
      expiresAt: Timestamp.fromDate(subDays(new Date(), 1)),
      invitedBy: USER_IDS.EMMA,
      invitedAt: Timestamp.fromDate(subDays(new Date(), 8)),
      organizationName: "Greenfield Equestrian",
      inviterName: "Emma Thompson",
    },
  ];

  invites.forEach((invite) => {
    const docRef = db.collection("invites").doc();
    batch.set(docRef, { ...invite, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${invites.length} invites`);
}

//============================================================================
// Phase 3: Stables (stables, stableMembers)
//============================================================================

async function seedStables() {
  console.log("\n📝 Phase 3.1: Seeding stables (3)...");
  const batch = db.batch();

  const stables = [
    {
      id: STABLE_IDS.MAIN_BARN,
      name: "Main Barn",
      description: "Primary facility with 20 stalls and indoor arena",
      address: "Sunny Lane 1, Stockholm, Sweden",
      organizationId: ORG_IDS.SUNNYDALE,
      ownerId: USER_IDS.ALICE,
      ownerEmail: "alice@sunnydale.com",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      updatedAt: Timestamp.now(),
    },
    {
      id: STABLE_IDS.TRAINING,
      name: "Training Facility",
      description: "Specialized training barn with breeding facilities",
      address: "Sunny Lane 2, Stockholm, Sweden",
      organizationId: ORG_IDS.SUNNYDALE,
      ownerId: USER_IDS.ALICE,
      ownerEmail: "alice@sunnydale.com",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
    },
    {
      id: STABLE_IDS.GREENFIELD_BARN,
      name: "Greenfield Barn",
      description: "Family-friendly recreational riding facility",
      address: "Green Road 5, Gothenburg, Sweden",
      organizationId: ORG_IDS.GREENFIELD,
      ownerId: USER_IDS.EMMA,
      ownerEmail: "emma@greenfield.com",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
    },
  ];

  stables.forEach((stable) => {
    batch.set(db.collection("stables").doc(stable.id), stable);
  });

  await batch.commit();
  console.log(`   ✅ Created ${stables.length} stables`);

  // Update organization stable counts
  await db.collection("organizations").doc(ORG_IDS.SUNNYDALE).update({
    "stats.stableCount": 2,
  });
  await db.collection("organizations").doc(ORG_IDS.GREENFIELD).update({
    "stats.stableCount": 1,
  });
  console.log("   ✅ Updated organization stable counts");
}

async function seedStableMembers() {
  console.log("\n📝 Phase 3.2: Seeding stableMembers (8)...");
  const batch = db.batch();

  const members = [
    // Main Barn members
    {
      id: `${USER_IDS.ALICE}_${STABLE_IDS.MAIN_BARN}`,
      stableId: STABLE_IDS.MAIN_BARN,
      userId: USER_IDS.ALICE,
      userEmail: "alice@sunnydale.com",
      firstName: "Alice",
      lastName: "Johnson",
      role: "manager",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      invitedBy: "system",
    },
    {
      id: `${USER_IDS.BOB}_${STABLE_IDS.MAIN_BARN}`,
      stableId: STABLE_IDS.MAIN_BARN,
      userId: USER_IDS.BOB,
      userEmail: "bob@sunnydale.com",
      firstName: "Bob",
      lastName: "Williams",
      role: "manager",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      invitedBy: USER_IDS.ALICE,
    },
    {
      id: `${USER_IDS.DAVID}_${STABLE_IDS.MAIN_BARN}`,
      stableId: STABLE_IDS.MAIN_BARN,
      userId: USER_IDS.DAVID,
      userEmail: "david@example.com",
      firstName: "David",
      lastName: "Chen",
      role: "member",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      invitedBy: USER_IDS.ALICE,
    },
    // Training Facility members
    {
      id: `${USER_IDS.ALICE}_${STABLE_IDS.TRAINING}`,
      stableId: STABLE_IDS.TRAINING,
      userId: USER_IDS.ALICE,
      userEmail: "alice@sunnydale.com",
      firstName: "Alice",
      lastName: "Johnson",
      role: "manager",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      invitedBy: "system",
    },
    {
      id: `${USER_IDS.BOB}_${STABLE_IDS.TRAINING}`,
      stableId: STABLE_IDS.TRAINING,
      userId: USER_IDS.BOB,
      userEmail: "bob@sunnydale.com",
      firstName: "Bob",
      lastName: "Williams",
      role: "manager",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      invitedBy: USER_IDS.ALICE,
    },
    // Greenfield Barn members
    {
      id: `${USER_IDS.EMMA}_${STABLE_IDS.GREENFIELD_BARN}`,
      stableId: STABLE_IDS.GREENFIELD_BARN,
      userId: USER_IDS.EMMA,
      userEmail: "emma@greenfield.com",
      firstName: "Emma",
      lastName: "Thompson",
      role: "manager",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      invitedBy: "system",
    },
    {
      id: `${USER_IDS.FRANK}_${STABLE_IDS.GREENFIELD_BARN}`,
      stableId: STABLE_IDS.GREENFIELD_BARN,
      userId: USER_IDS.FRANK,
      userEmail: "frank@example.com",
      firstName: "Frank",
      lastName: "Garcia",
      role: "member",
      status: "active",
      joinedAt: Timestamp.fromDate(subMonths(new Date(), 1)),
      invitedBy: USER_IDS.EMMA,
    },
    {
      id: `${USER_IDS.GRACE}_${STABLE_IDS.GREENFIELD_BARN}`,
      stableId: STABLE_IDS.GREENFIELD_BARN,
      userId: USER_IDS.GRACE,
      userEmail: "grace@example.com",
      firstName: "Grace",
      lastName: "Lee",
      role: "member",
      status: "active",
      joinedAt: Timestamp.fromDate(subWeeks(new Date(), 2)),
      invitedBy: USER_IDS.EMMA,
    },
  ];

  members.forEach((member) => {
    batch.set(db.collection("stableMembers").doc(member.id), member);
  });

  await batch.commit();
  console.log(`   ✅ Created ${members.length} stable members`);
}

//============================================================================
// Phase 4: Horses (horseGroups, horses, locationHistory)
//============================================================================

async function seedHorseGroups() {
  console.log("\n📝 Phase 4.1: Seeding horseGroups (4)...");
  const batch = db.batch();

  const groups = [
    {
      id: GROUP_IDS.COMPETITION,
      name: "Competition",
      description: "Horses actively competing in shows",
      color: "#FF6B6B",
      stableId: STABLE_IDS.MAIN_BARN,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: GROUP_IDS.TRAINING,
      name: "Training",
      description: "Horses in active training programs",
      color: "#4ECDC4",
      stableId: STABLE_IDS.MAIN_BARN,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: GROUP_IDS.BREEDING,
      name: "Breeding",
      description: "Breeding stock and young horses",
      color: "#95E1D3",
      stableId: STABLE_IDS.TRAINING,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: GROUP_IDS.RETIRED,
      name: "Retired",
      description: "Retired horses enjoying leisure time",
      color: "#F38181",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.EMMA,
    },
  ];

  groups.forEach((group) => {
    batch.set(db.collection("horseGroups").doc(group.id), group);
  });

  await batch.commit();
  console.log(`   ✅ Created ${groups.length} horse groups`);
}

async function seedHorses() {
  console.log("\n📝 Phase 4.2: Seeding horses (12)...");
  const batch = db.batch();

  const horses = [
    // Main Barn - Assigned horses (4)
    {
      id: HORSE_IDS.THUNDER,
      name: "Thunder",
      breed: "Thoroughbred",
      color: "Bay",
      gender: "Stallion",
      dateOfBirth: Timestamp.fromDate(new Date("2018-03-15")),
      microchipNumber: "SE123456789001",
      passportNumber: "FEI123456789",
      ownerId: USER_IDS.ALICE,
      ownerName: "Alice Johnson",
      ownerEmail: "alice@sunnydale.com",
      currentStableId: STABLE_IDS.MAIN_BARN,
      currentStableName: "Main Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 6)),
      usage: "Competition",
      groupId: GROUP_IDS.COMPETITION,
      vaccinationRuleId: "system-fei",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: HORSE_IDS.LIGHTNING,
      name: "Lightning",
      breed: "Warmblood",
      color: "Chestnut",
      gender: "Mare",
      dateOfBirth: Timestamp.fromDate(new Date("2017-05-20")),
      microchipNumber: "SE123456789002",
      passportNumber: "KNHS987654321",
      ownerId: USER_IDS.ALICE,
      ownerName: "Alice Johnson",
      ownerEmail: "alice@sunnydale.com",
      currentStableId: STABLE_IDS.MAIN_BARN,
      currentStableName: "Main Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 6)),
      usage: "Training",
      groupId: GROUP_IDS.TRAINING,
      vaccinationRuleId: "system-knhs",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: HORSE_IDS.STORM,
      name: "Storm",
      breed: "Arabian",
      color: "Grey",
      gender: "Gelding",
      dateOfBirth: Timestamp.fromDate(new Date("2019-08-10")),
      microchipNumber: "SE123456789003",
      passportNumber: null,
      ownerId: USER_IDS.BOB,
      ownerName: "Bob Williams",
      ownerEmail: "bob@sunnydale.com",
      currentStableId: STABLE_IDS.MAIN_BARN,
      currentStableName: "Main Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 5)),
      usage: "Recreation",
      groupId: GROUP_IDS.TRAINING,
      vaccinationRuleId: "rule_custom_org1",
      vaccinationStatus: "expiring_soon",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.BOB,
    },
    {
      id: HORSE_IDS.BLAZE,
      name: "Blaze",
      breed: "Quarter Horse",
      color: "Palomino",
      gender: "Gelding",
      dateOfBirth: Timestamp.fromDate(new Date("2016-02-28")),
      microchipNumber: "SE123456789004",
      passportNumber: null,
      ownerId: USER_IDS.DAVID,
      ownerName: "David Chen",
      ownerEmail: "david@example.com",
      currentStableId: STABLE_IDS.MAIN_BARN,
      currentStableName: "Main Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 3)),
      usage: "Recreation",
      groupId: GROUP_IDS.COMPETITION,
      vaccinationRuleId: "rule_custom_user",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
    // Training Facility - Assigned horses (2)
    {
      id: HORSE_IDS.STAR,
      name: "Star",
      breed: "Andalusian",
      color: "Black",
      gender: "Mare",
      dateOfBirth: Timestamp.fromDate(new Date("2020-06-15")),
      microchipNumber: "SE123456789005",
      passportNumber: "FEI987654321",
      ownerId: USER_IDS.ALICE,
      ownerName: "Alice Johnson",
      ownerEmail: "alice@sunnydale.com",
      currentStableId: STABLE_IDS.TRAINING,
      currentStableName: "Training Facility",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 4)),
      usage: "Breeding",
      groupId: GROUP_IDS.BREEDING,
      vaccinationRuleId: "system-fei",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: HORSE_IDS.DUSTY,
      name: "Dusty",
      breed: "Mustang",
      color: "Dun",
      gender: "Gelding",
      dateOfBirth: Timestamp.fromDate(new Date("2015-11-05")),
      microchipNumber: "SE123456789006",
      passportNumber: null,
      ownerId: USER_IDS.BOB,
      ownerName: "Bob Williams",
      ownerEmail: "bob@sunnydale.com",
      currentStableId: STABLE_IDS.TRAINING,
      currentStableName: "Training Facility",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 4)),
      usage: "Training",
      groupId: GROUP_IDS.BREEDING,
      vaccinationRuleId: "system-knhs",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.BOB,
    },
    // Greenfield Barn - Assigned horses (2)
    {
      id: HORSE_IDS.RAVEN,
      name: "Raven",
      breed: "Morgan",
      color: "Black",
      gender: "Mare",
      dateOfBirth: Timestamp.fromDate(new Date("2014-09-20")),
      microchipNumber: "SE123456789007",
      passportNumber: null,
      ownerId: USER_IDS.EMMA,
      ownerName: "Emma Thompson",
      ownerEmail: "emma@greenfield.com",
      currentStableId: STABLE_IDS.GREENFIELD_BARN,
      currentStableName: "Greenfield Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 2)),
      usage: "Recreation",
      groupId: GROUP_IDS.RETIRED,
      vaccinationRuleId: "system-knhs",
      vaccinationStatus: "expired",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.EMMA,
    },
    {
      id: HORSE_IDS.PHOENIX,
      name: "Phoenix",
      breed: "Paint",
      color: "Pinto",
      gender: "Gelding",
      dateOfBirth: Timestamp.fromDate(new Date("2013-04-12")),
      microchipNumber: "SE123456789008",
      passportNumber: null,
      ownerId: USER_IDS.FRANK,
      ownerName: "Frank Garcia",
      ownerEmail: "frank@example.com",
      currentStableId: STABLE_IDS.GREENFIELD_BARN,
      currentStableName: "Greenfield Barn",
      dateOfArrival: Timestamp.fromDate(subMonths(new Date(), 1)),
      usage: "Recreation",
      groupId: GROUP_IDS.RETIRED,
      vaccinationRuleId: "system-knhs",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 1)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.FRANK,
    },
    // Unassigned horses (2) - David's horses not at any stable
    {
      id: HORSE_IDS.SPIRIT,
      name: "Spirit",
      breed: "Arabian",
      color: "White",
      gender: "Stallion",
      dateOfBirth: Timestamp.fromDate(new Date("2021-01-10")),
      microchipNumber: "SE123456789009",
      passportNumber: null,
      ownerId: USER_IDS.DAVID,
      ownerName: "David Chen",
      ownerEmail: "david@example.com",
      usage: "Breeding",
      vaccinationRuleId: "rule_custom_user",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
    {
      id: HORSE_IDS.COMET,
      name: "Comet",
      breed: "Thoroughbred",
      color: "Grey",
      gender: "Gelding",
      dateOfBirth: Timestamp.fromDate(new Date("2019-07-22")),
      microchipNumber: "SE123456789010",
      passportNumber: "FEI111222333",
      ownerId: USER_IDS.DAVID,
      ownerName: "David Chen",
      ownerEmail: "david@example.com",
      usage: "Training",
      vaccinationRuleId: "system-fei",
      vaccinationStatus: "valid",
      isExternal: false,
      createdAt: Timestamp.fromDate(subWeeks(new Date(), 8)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.DAVID,
    },
    // External horses (2) - NO currentStableId, dateOfArrival, or usage
    {
      id: HORSE_IDS.MIDNIGHT,
      name: "Midnight",
      breed: "Friesian",
      color: "Black",
      gender: "Stallion",
      dateOfBirth: Timestamp.fromDate(new Date("2012-12-01")),
      microchipNumber: "SE123456789011",
      passportNumber: "KNHS444555666",
      ownerId: USER_IDS.ALICE,
      ownerName: "Alice Johnson",
      ownerEmail: "alice@sunnydale.com",
      isExternal: true,
      externalLocation: "New Owner Farm, Uppsala",
      externalMoveType: "permanent",
      externalDepartureDate: Timestamp.fromDate(subWeeks(new Date(), 4)),
      vaccinationRuleId: "system-knhs",
      vaccinationStatus: "unknown",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: HORSE_IDS.SHADOW,
      name: "Shadow",
      breed: "Thoroughbred",
      color: "Dark Bay",
      gender: "Mare",
      dateOfBirth: Timestamp.fromDate(new Date("2016-08-30")),
      microchipNumber: "SE123456789012",
      passportNumber: "FEI777888999",
      ownerId: USER_IDS.BOB,
      ownerName: "Bob Williams",
      ownerEmail: "bob@sunnydale.com",
      isExternal: true,
      externalLocation: "Veterinary Clinic Stockholm",
      externalMoveType: "temporary",
      externalDepartureDate: Timestamp.fromDate(subDays(new Date(), 5)),
      expectedReturnDate: Timestamp.fromDate(addDays(new Date(), 10)),
      vaccinationRuleId: "system-fei",
      vaccinationStatus: "valid",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      updatedAt: Timestamp.now(),
      createdBy: USER_IDS.BOB,
    },
  ];

  horses.forEach((horse) => {
    batch.set(db.collection("horses").doc(horse.id), horse);
  });

  await batch.commit();
  console.log(`   ✅ Created ${horses.length} horses`);
}

async function seedLocationHistory() {
  console.log("\n📝 Phase 4.3: Seeding locationHistory (20 entries)...");

  // Location history is a subcollection under horses, so we need to create entries for each horse
  const historyEntries = [
    // Thunder - Main Barn (arrived 6 months ago, moved stalls once)
    {
      horseId: HORSE_IDS.THUNDER,
      entries: [
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 6)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "A12",
          reason: "Permanent residence",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
          createdBy: USER_IDS.ALICE,
        },
      ],
    },
    // Lightning - Main Barn (stable resident)
    {
      horseId: HORSE_IDS.LIGHTNING,
      entries: [
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 6)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "A15",
          reason: "Permanent residence",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
          createdBy: USER_IDS.ALICE,
        },
      ],
    },
    // Storm - Main Barn (moved from Training Facility)
    {
      horseId: HORSE_IDS.STORM,
      entries: [
        {
          locationId: STABLE_IDS.TRAINING,
          locationName: "Training Facility",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 5)),
          departureDate: Timestamp.fromDate(subMonths(new Date(), 2)),
          currentLocation: false,
          reason: "Initial training period",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
          createdBy: USER_IDS.BOB,
        },
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 2)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "B08",
          reason: "Training completed",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
          createdBy: USER_IDS.BOB,
        },
      ],
    },
    // Blaze - Main Barn (David's horse)
    {
      horseId: HORSE_IDS.BLAZE,
      entries: [
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 3)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "C05",
          reason: "Owner boarding",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
          createdBy: USER_IDS.DAVID,
        },
      ],
    },
    // Star - Training Facility (breeding mare)
    {
      horseId: HORSE_IDS.STAR,
      entries: [
        {
          locationId: STABLE_IDS.TRAINING,
          locationName: "Training Facility",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 4)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "T02",
          reason: "Breeding program",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
          createdBy: USER_IDS.ALICE,
        },
      ],
    },
    // Dusty - Training Facility (experienced trainer)
    {
      horseId: HORSE_IDS.DUSTY,
      entries: [
        {
          locationId: STABLE_IDS.TRAINING,
          locationName: "Training Facility",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 4)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "T05",
          reason: "Training horses",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
          createdBy: USER_IDS.BOB,
        },
      ],
    },
    // Raven - Greenfield (retired mare)
    {
      horseId: HORSE_IDS.RAVEN,
      entries: [
        {
          locationId: STABLE_IDS.GREENFIELD_BARN,
          locationName: "Greenfield Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 2)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "G01",
          reason: "Retirement home",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
          createdBy: USER_IDS.EMMA,
        },
      ],
    },
    // Phoenix - Greenfield (Frank's horse)
    {
      horseId: HORSE_IDS.PHOENIX,
      entries: [
        {
          locationId: STABLE_IDS.GREENFIELD_BARN,
          locationName: "Greenfield Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 1)),
          departureDate: null,
          currentLocation: true,
          stallNumber: "G03",
          reason: "Owner boarding",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 1)),
          createdBy: USER_IDS.FRANK,
        },
      ],
    },
    // Midnight - External (sold, no longer at stable)
    {
      horseId: HORSE_IDS.MIDNIGHT,
      entries: [
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 4)),
          departureDate: Timestamp.fromDate(subWeeks(new Date(), 4)),
          currentLocation: false,
          stallNumber: "A20",
          reason: "Previous residence",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
          createdBy: USER_IDS.ALICE,
        },
        {
          locationId: "external_new_owner",
          locationName: "New Owner Farm, Uppsala",
          locationType: "external",
          arrivalDate: Timestamp.fromDate(subWeeks(new Date(), 4)),
          departureDate: null,
          currentLocation: true,
          reason: "Sold to new owner",
          createdAt: Timestamp.fromDate(subWeeks(new Date(), 4)),
          createdBy: USER_IDS.ALICE,
        },
      ],
    },
    // Shadow - External (temporary at vet clinic)
    {
      horseId: HORSE_IDS.SHADOW,
      entries: [
        {
          locationId: STABLE_IDS.MAIN_BARN,
          locationName: "Main Barn",
          locationType: "stable",
          arrivalDate: Timestamp.fromDate(subMonths(new Date(), 3)),
          departureDate: Timestamp.fromDate(subDays(new Date(), 5)),
          currentLocation: false,
          stallNumber: "A18",
          reason: "Previous residence",
          createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
          createdBy: USER_IDS.BOB,
        },
        {
          locationId: "external_vet_clinic",
          locationName: "Veterinary Clinic Stockholm",
          locationType: "external",
          arrivalDate: Timestamp.fromDate(subDays(new Date(), 5)),
          departureDate: null,
          currentLocation: true,
          reason: "Medical treatment",
          expectedReturnDate: Timestamp.fromDate(addDays(new Date(), 10)),
          createdAt: Timestamp.fromDate(subDays(new Date(), 5)),
          createdBy: USER_IDS.BOB,
        },
      ],
    },
  ];

  let totalEntries = 0;
  for (const { horseId, entries } of historyEntries) {
    const batch = db.batch();
    for (const entry of entries) {
      const docRef = db
        .collection("horses")
        .doc(horseId)
        .collection("locationHistory")
        .doc();
      batch.set(docRef, { ...entry, id: docRef.id });
      totalEntries++;
    }
    await batch.commit();
  }

  console.log(`   ✅ Created ${totalEntries} location history entries`);
}

//============================================================================
// Phase 5: Activities & Care (activityTypes, activities, vaccinationRecords)
//============================================================================

async function seedActivityTypes() {
  console.log("\n📝 Phase 5.1: Seeding activityTypes (30)...");

  // Standard activity types that each stable will have
  const standardTypes = [
    {
      name: "Feeding - Morning",
      category: "feeding",
      duration: 30,
      color: "#FFB74D",
    },
    {
      name: "Feeding - Evening",
      category: "feeding",
      duration: 30,
      color: "#FFA726",
    },
    { name: "Turnout", category: "exercise", duration: 120, color: "#81C784" },
    { name: "Grooming", category: "care", duration: 45, color: "#64B5F6" },
    {
      name: "Training Session",
      category: "training",
      duration: 60,
      color: "#E57373",
    },
    { name: "Vet Visit", category: "medical", duration: 45, color: "#F06292" },
    { name: "Farrier", category: "medical", duration: 60, color: "#BA68C8" },
    { name: "Medication", category: "medical", duration: 15, color: "#FF8A65" },
    {
      name: "Stall Cleaning",
      category: "maintenance",
      duration: 30,
      color: "#A1887F",
    },
    {
      name: "Arena Maintenance",
      category: "maintenance",
      duration: 90,
      color: "#90A4AE",
    },
  ];

  const stableConfigs = [
    { stableId: STABLE_IDS.MAIN_BARN, createdBy: USER_IDS.ALICE },
    { stableId: STABLE_IDS.TRAINING, createdBy: USER_IDS.ALICE },
    { stableId: STABLE_IDS.GREENFIELD_BARN, createdBy: USER_IDS.EMMA },
  ];

  const batch = db.batch();
  let count = 0;

  for (const stable of stableConfigs) {
    for (const type of standardTypes) {
      const docRef = db.collection("activityTypes").doc();
      batch.set(docRef, {
        id: docRef.id,
        ...type,
        stableId: stable.stableId,
        isActive: true,
        requiresHorse: type.category !== "maintenance",
        allowMultipleHorses: type.category === "training",
        createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
        updatedAt: Timestamp.now(),
        createdBy: stable.createdBy,
      });
      count++;
    }
  }

  await batch.commit();
  console.log(`   ✅ Created ${count} activity types`);
}

async function seedActivities() {
  console.log("\n📝 Phase 5.2: Seeding activities (30)...");
  const batch = db.batch();

  const activities = [
    // Activity type entries (15) - horse-related
    {
      type: "activity",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: HORSE_IDS.THUNDER,
      horseName: "Thunder",
      activityType: "Farrier",
      note: "Routine hoof trimming and shoeing",
      date: Timestamp.fromDate(subDays(new Date(), 3)),
      duration: 60,
      performedBy: USER_IDS.ALICE,
      performedByName: "Alice Johnson",
      createdAt: Timestamp.fromDate(subDays(new Date(), 3)),
      createdBy: USER_IDS.ALICE,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: HORSE_IDS.LIGHTNING,
      horseName: "Lightning",
      activityType: "Vet Visit",
      note: "Annual health checkup - all good",
      date: Timestamp.fromDate(subDays(new Date(), 7)),
      duration: 45,
      performedBy: USER_IDS.CAROL,
      performedByName: "Carol Martinez",
      createdAt: Timestamp.fromDate(subDays(new Date(), 7)),
      createdBy: USER_IDS.BOB,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: HORSE_IDS.STORM,
      horseName: "Storm",
      activityType: "Training Session",
      note: "Dressage training - excellent progress",
      date: Timestamp.fromDate(subDays(new Date(), 1)),
      duration: 60,
      performedBy: USER_IDS.BOB,
      performedByName: "Bob Williams",
      createdAt: Timestamp.fromDate(subDays(new Date(), 1)),
      createdBy: USER_IDS.BOB,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: HORSE_IDS.BLAZE,
      horseName: "Blaze",
      activityType: "Grooming",
      note: "Deep grooming session",
      date: Timestamp.fromDate(subDays(new Date(), 2)),
      duration: 45,
      performedBy: USER_IDS.DAVID,
      performedByName: "David Chen",
      createdAt: Timestamp.fromDate(subDays(new Date(), 2)),
      createdBy: USER_IDS.DAVID,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.TRAINING,
      horseId: HORSE_IDS.STAR,
      horseName: "Star",
      activityType: "Vet Visit",
      note: "Pregnancy check - confirmed pregnant",
      date: Timestamp.fromDate(subWeeks(new Date(), 1)),
      duration: 45,
      performedBy: USER_IDS.CAROL,
      performedByName: "Carol Martinez",
      createdAt: Timestamp.fromDate(subWeeks(new Date(), 1)),
      createdBy: USER_IDS.ALICE,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.TRAINING,
      horseId: HORSE_IDS.DUSTY,
      horseName: "Dusty",
      activityType: "Training Session",
      note: "Worked with young horses today",
      date: Timestamp.fromDate(subDays(new Date(), 1)),
      duration: 90,
      performedBy: USER_IDS.BOB,
      performedByName: "Bob Williams",
      createdAt: Timestamp.fromDate(subDays(new Date(), 1)),
      createdBy: USER_IDS.BOB,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      horseId: HORSE_IDS.RAVEN,
      horseName: "Raven",
      activityType: "Farrier",
      note: "Hoof trimming - needs more frequent visits",
      date: Timestamp.fromDate(subWeeks(new Date(), 2)),
      duration: 60,
      performedBy: USER_IDS.EMMA,
      performedByName: "Emma Thompson",
      createdAt: Timestamp.fromDate(subWeeks(new Date(), 2)),
      createdBy: USER_IDS.EMMA,
    },
    {
      type: "activity",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      horseId: HORSE_IDS.PHOENIX,
      horseName: "Phoenix",
      activityType: "Grooming",
      note: "Regular grooming session",
      date: Timestamp.now(),
      duration: 30,
      performedBy: USER_IDS.GRACE,
      performedByName: "Grace Lee",
      createdAt: Timestamp.now(),
      createdBy: USER_IDS.GRACE,
    },
    // Add more activities (7 more to reach 15)
    ...Array.from({ length: 7 }, (_, i) => ({
      type: "activity",
      stableId: i < 4 ? STABLE_IDS.MAIN_BARN : STABLE_IDS.GREENFIELD_BARN,
      horseId: [
        HORSE_IDS.THUNDER,
        HORSE_IDS.LIGHTNING,
        HORSE_IDS.STORM,
        HORSE_IDS.BLAZE,
        HORSE_IDS.RAVEN,
        HORSE_IDS.PHOENIX,
        HORSE_IDS.STAR,
      ][i],
      horseName: [
        "Thunder",
        "Lightning",
        "Storm",
        "Blaze",
        "Raven",
        "Phoenix",
        "Star",
      ][i],
      activityType: [
        "Feeding - Morning",
        "Turnout",
        "Medication",
        "Stall Cleaning",
        "Feeding - Evening",
        "Grooming",
        "Training Session",
      ][i],
      note: "Routine care activity",
      date: Timestamp.fromDate(subDays(new Date(), i + 1)),
      duration: 30,
      performedBy: i < 4 ? USER_IDS.ALICE : USER_IDS.EMMA,
      performedByName: i < 4 ? "Alice Johnson" : "Emma Thompson",
      createdAt: Timestamp.fromDate(subDays(new Date(), i + 1)),
      createdBy: i < 4 ? USER_IDS.ALICE : USER_IDS.EMMA,
    })),
    // Task type entries (10)
    {
      type: "task",
      stableId: STABLE_IDS.MAIN_BARN,
      title: "Clean Tack Room",
      description: "Deep clean and organize all tack and equipment",
      priority: "medium",
      status: "pending",
      dueDate: Timestamp.fromDate(addDays(new Date(), 2)),
      assignedTo: USER_IDS.ALICE,
      assignedToName: "Alice Johnson",
      createdAt: Timestamp.fromDate(subDays(new Date(), 1)),
      createdBy: USER_IDS.BOB,
    },
    {
      type: "task",
      stableId: STABLE_IDS.MAIN_BARN,
      title: "Arena Maintenance",
      description: "Level and water the arena surface",
      priority: "high",
      status: "in_progress",
      dueDate: Timestamp.fromDate(addDays(new Date(), 1)),
      assignedTo: USER_IDS.BOB,
      assignedToName: "Bob Williams",
      createdAt: Timestamp.fromDate(subDays(new Date(), 3)),
      createdBy: USER_IDS.ALICE,
    },
    {
      type: "task",
      stableId: STABLE_IDS.TRAINING,
      title: "Order Feed Supplies",
      description: "Restock hay and grain for next month",
      priority: "high",
      status: "pending",
      dueDate: Timestamp.fromDate(addDays(new Date(), 5)),
      assignedTo: USER_IDS.ALICE,
      assignedToName: "Alice Johnson",
      createdAt: Timestamp.fromDate(subDays(new Date(), 2)),
      createdBy: USER_IDS.ALICE,
    },
    {
      type: "task",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      title: "Repair Fence",
      description: "Fix broken section in paddock 3",
      priority: "urgent",
      status: "in_progress",
      dueDate: Timestamp.now(),
      assignedTo: USER_IDS.EMMA,
      assignedToName: "Emma Thompson",
      createdAt: Timestamp.fromDate(subDays(new Date(), 5)),
      createdBy: USER_IDS.EMMA,
    },
    // Add more tasks (6 more)
    ...Array.from({ length: 6 }, (_, i) => ({
      type: "task",
      stableId: i < 3 ? STABLE_IDS.MAIN_BARN : STABLE_IDS.GREENFIELD_BARN,
      title: [
        "Check Water System",
        "Organize Medical Supplies",
        "Schedule Equipment Service",
        "Clean Grooming Area",
        "Update Stable Board",
        "Review Safety Protocols",
      ][i],
      description: "Routine stable maintenance task",
      priority: ["low", "medium", "medium", "low", "low", "high"][i],
      status: i % 2 === 0 ? "pending" : "completed",
      dueDate: Timestamp.fromDate(addDays(new Date(), i + 1)),
      assignedTo: i < 3 ? USER_IDS.ALICE : USER_IDS.EMMA,
      assignedToName: i < 3 ? "Alice Johnson" : "Emma Thompson",
      createdAt: Timestamp.fromDate(subDays(new Date(), i + 2)),
      createdBy: i < 3 ? USER_IDS.BOB : USER_IDS.EMMA,
    })),
    // Message type entries (5)
    {
      type: "message",
      stableId: STABLE_IDS.MAIN_BARN,
      title: "Vet Visit Scheduled",
      content:
        "Dr. Martinez will be here on Friday for routine checkups. Please have your horses ready.",
      priority: "high",
      isRead: false,
      createdAt: Timestamp.fromDate(subDays(new Date(), 2)),
      createdBy: USER_IDS.ALICE,
      createdByName: "Alice Johnson",
    },
    {
      type: "message",
      stableId: STABLE_IDS.MAIN_BARN,
      title: "Weather Alert",
      content:
        "Severe weather expected tomorrow. All horses should be brought in early.",
      priority: "urgent",
      isRead: true,
      createdAt: Timestamp.fromDate(subDays(new Date(), 1)),
      createdBy: USER_IDS.BOB,
      createdByName: "Bob Williams",
    },
    {
      type: "message",
      stableId: STABLE_IDS.TRAINING,
      title: "Schedule Change",
      content:
        "Training sessions moved to afternoon this week due to arena maintenance.",
      priority: "medium",
      isRead: false,
      createdAt: Timestamp.fromDate(subDays(new Date(), 3)),
      createdBy: USER_IDS.ALICE,
      createdByName: "Alice Johnson",
    },
    {
      type: "message",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      title: "New Feed Delivery",
      content:
        "Premium hay delivery arriving Monday. Please clear storage area.",
      priority: "medium",
      isRead: true,
      createdAt: Timestamp.fromDate(subWeeks(new Date(), 1)),
      createdBy: USER_IDS.EMMA,
      createdByName: "Emma Thompson",
    },
    {
      type: "message",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      title: "Safety Reminder",
      content: "Reminder: Always wear helmets when riding. Safety first!",
      priority: "low",
      isRead: false,
      createdAt: Timestamp.fromDate(subDays(new Date(), 4)),
      createdBy: USER_IDS.EMMA,
      createdByName: "Emma Thompson",
    },
  ];

  activities.forEach((activity) => {
    const docRef = db.collection("activities").doc();
    batch.set(docRef, { ...activity, id: docRef.id });
  });

  await batch.commit();
  console.log(
    `   ✅ Created ${activities.length} activities (15 activities + 10 tasks + 5 messages)`,
  );
}

async function seedVaccinationRecords() {
  console.log("\n📝 Phase 5.3: Seeding vaccinationRecords (15)...");
  const batch = db.batch();

  const records = [
    // Thunder - FEI rule, valid
    {
      horseId: HORSE_IDS.THUNDER,
      horseName: "Thunder",
      ruleId: "system-fei",
      ruleName: "FEI rules",
      vaccinationDate: Timestamp.fromDate(subMonths(new Date(), 3)),
      nextDueDate: Timestamp.fromDate(addMonths(new Date(), 3)),
      veterinarianName: "Dr. Carol Martinez",
      notes: "Annual FEI vaccination - all good",
      batchNumber: "FEI-2025-001",
      status: "valid",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 3)),
      createdBy: USER_IDS.ALICE,
    },
    // Lightning - KNHS rule, valid
    {
      horseId: HORSE_IDS.LIGHTNING,
      horseName: "Lightning",
      ruleId: "system-knhs",
      ruleName: "KNHS rules",
      vaccinationDate: Timestamp.fromDate(subMonths(new Date(), 6)),
      nextDueDate: Timestamp.fromDate(addMonths(new Date(), 6)),
      veterinarianName: "Dr. Carol Martinez",
      notes: "Annual KNHS vaccination",
      batchNumber: "KNHS-2025-001",
      status: "valid",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      createdBy: USER_IDS.ALICE,
    },
    // Storm - Custom org rule, expiring soon
    {
      horseId: HORSE_IDS.STORM,
      horseName: "Storm",
      ruleId: "rule_custom_org1",
      ruleName: "Sunnydale Custom",
      vaccinationDate: Timestamp.fromDate(subMonths(new Date(), 8)),
      nextDueDate: Timestamp.fromDate(addMonths(new Date(), 1)),
      veterinarianName: "Dr. Carol Martinez",
      notes: "Custom vaccination schedule",
      batchNumber: "CUSTOM-2024-015",
      status: "expiring_soon",
      createdAt: Timestamp.fromDate(subMonths(new Date(), 8)),
      createdBy: USER_IDS.BOB,
    },
    // Add more records (12 more to reach 15)
    ...Array.from({ length: 12 }, (_, i) => {
      const horses = [
        { id: HORSE_IDS.BLAZE, name: "Blaze", ownerId: USER_IDS.DAVID },
        { id: HORSE_IDS.STAR, name: "Star", ownerId: USER_IDS.ALICE },
        { id: HORSE_IDS.DUSTY, name: "Dusty", ownerId: USER_IDS.BOB },
        { id: HORSE_IDS.RAVEN, name: "Raven", ownerId: USER_IDS.EMMA },
        { id: HORSE_IDS.PHOENIX, name: "Phoenix", ownerId: USER_IDS.FRANK },
        { id: HORSE_IDS.SPIRIT, name: "Spirit", ownerId: USER_IDS.DAVID },
        { id: HORSE_IDS.COMET, name: "Comet", ownerId: USER_IDS.DAVID },
        { id: HORSE_IDS.THUNDER, name: "Thunder", ownerId: USER_IDS.ALICE },
        { id: HORSE_IDS.LIGHTNING, name: "Lightning", ownerId: USER_IDS.ALICE },
        { id: HORSE_IDS.STORM, name: "Storm", ownerId: USER_IDS.BOB },
        { id: HORSE_IDS.BLAZE, name: "Blaze", ownerId: USER_IDS.DAVID },
        { id: HORSE_IDS.RAVEN, name: "Raven", ownerId: USER_IDS.EMMA },
      ][i];

      const rules = [
        "system-fei",
        "system-knhs",
        "rule_custom_org1",
        "rule_custom_user",
      ];
      const ruleId = rules[i % 4];
      const ruleNames = {
        "system-fei": "FEI rules",
        "system-knhs": "KNHS rules",
        rule_custom_org1: "Sunnydale Custom",
        rule_custom_user: "David's Custom Rule",
      };

      return {
        horseId: horses.id,
        horseName: horses.name,
        ruleId,
        ruleName: ruleNames[ruleId],
        vaccinationDate: Timestamp.fromDate(subMonths(new Date(), i + 1)),
        nextDueDate: Timestamp.fromDate(
          addMonths(new Date(), i % 3 === 0 ? 1 : i % 2 === 0 ? 6 : 12),
        ),
        veterinarianName: "Dr. Carol Martinez",
        notes: `Vaccination record ${i + 1}`,
        batchNumber: `BATCH-2025-${String(i + 10).padStart(3, "0")}`,
        status:
          i % 4 === 0 ? "expiring_soon" : i % 5 === 0 ? "expired" : "valid",
        createdAt: Timestamp.fromDate(subMonths(new Date(), i + 1)),
        createdBy: horses.ownerId,
      };
    }),
  ];

  records.forEach((record) => {
    const docRef = db.collection("vaccinationRecords").doc();
    batch.set(docRef, { ...record, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${records.length} vaccination records`);
}

//============================================================================
// Phase 6: Facilities & Scheduling (facilities, facilityReservations, shiftTypes, schedules, shifts)
//============================================================================

async function seedFacilities() {
  console.log("\n📝 Phase 6.1: Seeding facilities (6)...");
  const batch = db.batch();

  const facilities = [
    // Main Barn facilities
    {
      id: FACILITY_IDS.INDOOR_ARENA,
      name: "Indoor Arena",
      description: "20x40m indoor riding arena with mirrors",
      stableId: STABLE_IDS.MAIN_BARN,
      facilityType: "arena",
      maxCapacity: 4,
      bookingDuration: 30,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: FACILITY_IDS.OUTDOOR_ARENA,
      name: "Outdoor Arena",
      description: "20x60m outdoor competition arena",
      stableId: STABLE_IDS.MAIN_BARN,
      facilityType: "arena",
      maxCapacity: 6,
      bookingDuration: 30,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 6)),
      createdBy: USER_IDS.ALICE,
    },
    {
      id: FACILITY_IDS.WALKER,
      name: "Horse Walker",
      description: "Automated 4-horse walker",
      stableId: STABLE_IDS.MAIN_BARN,
      facilityType: "equipment",
      maxCapacity: 4,
      bookingDuration: 15,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      createdBy: USER_IDS.ALICE,
    },
    // Training Facility facilities
    {
      id: FACILITY_IDS.PADDOCK,
      name: "Training Paddock",
      description: "Large training paddock with jumps",
      stableId: STABLE_IDS.TRAINING,
      facilityType: "paddock",
      maxCapacity: 2,
      bookingDuration: 60,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 4)),
      createdBy: USER_IDS.ALICE,
    },
    // Greenfield facilities
    {
      id: FACILITY_IDS.SOLARIUM,
      name: "Solarium",
      description: "Horse solarium for warmup/cooldown",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      facilityType: "equipment",
      maxCapacity: 1,
      bookingDuration: 20,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      createdBy: USER_IDS.EMMA,
    },
    {
      id: FACILITY_IDS.TREADMILL,
      name: "Water Treadmill",
      description: "Aqua therapy treadmill",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      facilityType: "medical",
      maxCapacity: 1,
      bookingDuration: 30,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 1)),
      createdBy: USER_IDS.EMMA,
    },
  ];

  facilities.forEach((facility) => {
    batch.set(db.collection("facilities").doc(facility.id), facility);
  });

  await batch.commit();
  console.log(`   ✅ Created ${facilities.length} facilities`);
}

async function seedFacilityReservations() {
  console.log("\n📝 Phase 6.2: Seeding facilityReservations (12)...");
  const batch = db.batch();

  const baseTime = new Date();
  const reservations = [
    // Indoor Arena reservations
    ...Array.from({ length: 4 }, (_, i) => ({
      facilityId: FACILITY_IDS.INDOOR_ARENA,
      facilityName: "Indoor Arena",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: [
        HORSE_IDS.THUNDER,
        HORSE_IDS.LIGHTNING,
        HORSE_IDS.STORM,
        HORSE_IDS.BLAZE,
      ][i],
      horseName: ["Thunder", "Lightning", "Storm", "Blaze"][i],
      userId: [USER_IDS.ALICE, USER_IDS.ALICE, USER_IDS.BOB, USER_IDS.DAVID][i],
      userName: [
        "Alice Johnson",
        "Alice Johnson",
        "Bob Williams",
        "David Chen",
      ][i],
      startTime: Timestamp.fromDate(addHours(baseTime, i * 2)),
      endTime: Timestamp.fromDate(addHours(baseTime, i * 2 + 0.5)),
      status: i < 2 ? "confirmed" : "pending",
      purpose: "Training session",
      createdAt: Timestamp.fromDate(subDays(baseTime, 2)),
      createdBy: [USER_IDS.ALICE, USER_IDS.ALICE, USER_IDS.BOB, USER_IDS.DAVID][
        i
      ],
    })),
    // Outdoor Arena reservations
    ...Array.from({ length: 3 }, (_, i) => ({
      facilityId: FACILITY_IDS.OUTDOOR_ARENA,
      facilityName: "Outdoor Arena",
      stableId: STABLE_IDS.MAIN_BARN,
      horseId: [HORSE_IDS.THUNDER, HORSE_IDS.STORM, HORSE_IDS.LIGHTNING][i],
      horseName: ["Thunder", "Storm", "Lightning"][i],
      userId: [USER_IDS.ALICE, USER_IDS.BOB, USER_IDS.ALICE][i],
      userName: ["Alice Johnson", "Bob Williams", "Alice Johnson"][i],
      startTime: Timestamp.fromDate(addDays(baseTime, i + 1)),
      endTime: Timestamp.fromDate(addHours(addDays(baseTime, i + 1), 1)),
      status: "confirmed",
      purpose: "Competition prep",
      createdAt: Timestamp.fromDate(subDays(baseTime, 1)),
      createdBy: [USER_IDS.ALICE, USER_IDS.BOB, USER_IDS.ALICE][i],
    })),
    // Other facility reservations
    ...Array.from({ length: 5 }, (_, i) => ({
      facilityId: [
        FACILITY_IDS.WALKER,
        FACILITY_IDS.PADDOCK,
        FACILITY_IDS.SOLARIUM,
        FACILITY_IDS.TREADMILL,
        FACILITY_IDS.WALKER,
      ][i],
      facilityName: [
        "Horse Walker",
        "Training Paddock",
        "Solarium",
        "Water Treadmill",
        "Horse Walker",
      ][i],
      stableId:
        i < 2
          ? STABLE_IDS.MAIN_BARN
          : i < 3
            ? STABLE_IDS.TRAINING
            : STABLE_IDS.GREENFIELD_BARN,
      horseId: [
        HORSE_IDS.BLAZE,
        HORSE_IDS.STAR,
        HORSE_IDS.RAVEN,
        HORSE_IDS.PHOENIX,
        HORSE_IDS.THUNDER,
      ][i],
      horseName: ["Blaze", "Star", "Raven", "Phoenix", "Thunder"][i],
      userId: [
        USER_IDS.DAVID,
        USER_IDS.ALICE,
        USER_IDS.EMMA,
        USER_IDS.FRANK,
        USER_IDS.ALICE,
      ][i],
      userName: [
        "David Chen",
        "Alice Johnson",
        "Emma Thompson",
        "Frank Garcia",
        "Alice Johnson",
      ][i],
      startTime: Timestamp.fromDate(addDays(baseTime, i)),
      endTime: Timestamp.fromDate(addHours(addDays(baseTime, i), 0.5)),
      status: i % 2 === 0 ? "confirmed" : "pending",
      purpose: ["Exercise", "Training", "Recovery", "Therapy", "Warmup"][i],
      createdAt: Timestamp.fromDate(subDays(baseTime, 3)),
      createdBy: [
        USER_IDS.DAVID,
        USER_IDS.ALICE,
        USER_IDS.EMMA,
        USER_IDS.FRANK,
        USER_IDS.ALICE,
      ][i],
    })),
  ];

  reservations.forEach((reservation) => {
    const docRef = db.collection("facilityReservations").doc();
    batch.set(docRef, { ...reservation, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${reservations.length} facility reservations`);
}

async function seedShiftTypesAndSchedules() {
  console.log("\n📝 Phase 6.3: Seeding shiftTypes (6) and schedules (2)...");

  // Shift Types
  const shiftTypesBatch = db.batch();
  const shiftTypes = [
    // Main Barn shift types
    {
      name: "Morning Feed",
      stableId: STABLE_IDS.MAIN_BARN,
      duration: 60,
      startTime: "07:00",
      category: "feeding",
      color: "#FFB74D",
      createdBy: USER_IDS.ALICE,
    },
    {
      name: "Evening Feed",
      stableId: STABLE_IDS.MAIN_BARN,
      duration: 60,
      startTime: "17:00",
      category: "feeding",
      color: "#FFA726",
      createdBy: USER_IDS.ALICE,
    },
    {
      name: "Turnout",
      stableId: STABLE_IDS.MAIN_BARN,
      duration: 120,
      startTime: "09:00",
      category: "exercise",
      color: "#81C784",
      createdBy: USER_IDS.ALICE,
    },
    // Greenfield shift types
    {
      name: "Morning Feed",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      duration: 45,
      startTime: "07:30",
      category: "feeding",
      color: "#FFB74D",
      createdBy: USER_IDS.EMMA,
    },
    {
      name: "Evening Feed",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      duration: 45,
      startTime: "17:30",
      category: "feeding",
      color: "#FFA726",
      createdBy: USER_IDS.EMMA,
    },
    {
      name: "Paddock Turnout",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      duration: 180,
      startTime: "10:00",
      category: "exercise",
      color: "#81C784",
      createdBy: USER_IDS.EMMA,
    },
  ];

  shiftTypes.forEach((type) => {
    const docRef = db.collection("shiftTypes").doc();
    shiftTypesBatch.set(docRef, {
      ...type,
      id: docRef.id,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      updatedAt: Timestamp.now(),
    });
  });

  await shiftTypesBatch.commit();
  console.log(`   ✅ Created ${shiftTypes.length} shift types`);

  // Schedules
  const schedulesBatch = db.batch();
  const schedules = [
    {
      name: "Main Barn Weekly Schedule",
      stableId: STABLE_IDS.MAIN_BARN,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 5)),
      createdBy: USER_IDS.ALICE,
    },
    {
      name: "Greenfield Weekly Schedule",
      stableId: STABLE_IDS.GREENFIELD_BARN,
      isActive: true,
      createdAt: Timestamp.fromDate(subMonths(new Date(), 2)),
      createdBy: USER_IDS.EMMA,
    },
  ];

  schedules.forEach((schedule) => {
    const docRef = db.collection("schedules").doc();
    schedulesBatch.set(docRef, { ...schedule, id: docRef.id });
  });

  await schedulesBatch.commit();
  console.log(`   ✅ Created ${schedules.length} schedules`);
}

async function seedShifts() {
  console.log("\n📝 Phase 6.4: Seeding shifts (30)...");
  const batch = db.batch();

  // Generate shifts for the next 7 days
  const shifts = [];
  for (let day = 0; day < 7; day++) {
    const date = addDays(new Date(), day);

    // Main Barn shifts (3 per day)
    shifts.push({
      stableId: STABLE_IDS.MAIN_BARN,
      shiftType: "Morning Feed",
      date: Timestamp.fromDate(date),
      startTime: "07:00",
      duration: 60,
      status: day < 2 ? "completed" : day < 5 ? "assigned" : "open",
      assignedTo: day < 5 ? USER_IDS.ALICE : null,
      assignedToName: day < 5 ? "Alice Johnson" : null,
      completedAt: day < 2 ? Timestamp.fromDate(addHours(date, 1)) : null,
      createdAt: Timestamp.fromDate(subDays(new Date(), 7 - day)),
      createdBy: USER_IDS.ALICE,
    });

    shifts.push({
      stableId: STABLE_IDS.MAIN_BARN,
      shiftType: "Evening Feed",
      date: Timestamp.fromDate(date),
      startTime: "17:00",
      duration: 60,
      status: day < 2 ? "completed" : day < 4 ? "assigned" : "open",
      assignedTo: day < 4 ? USER_IDS.BOB : null,
      assignedToName: day < 4 ? "Bob Williams" : null,
      completedAt: day < 2 ? Timestamp.fromDate(addHours(date, 18)) : null,
      createdAt: Timestamp.fromDate(subDays(new Date(), 7 - day)),
      createdBy: USER_IDS.ALICE,
    });

    // Greenfield shifts (1-2 per day)
    if (day < 5) {
      shifts.push({
        stableId: STABLE_IDS.GREENFIELD_BARN,
        shiftType: "Morning Feed",
        date: Timestamp.fromDate(date),
        startTime: "07:30",
        duration: 45,
        status: day < 2 ? "completed" : "assigned",
        assignedTo: USER_IDS.EMMA,
        assignedToName: "Emma Thompson",
        completedAt: day < 2 ? Timestamp.fromDate(addHours(date, 0.75)) : null,
        createdAt: Timestamp.fromDate(subDays(new Date(), 7 - day)),
        createdBy: USER_IDS.EMMA,
      });
    }
  }

  // Add a few more shifts to reach 30
  for (let i = 0; i < 9; i++) {
    shifts.push({
      stableId: i < 5 ? STABLE_IDS.MAIN_BARN : STABLE_IDS.GREENFIELD_BARN,
      shiftType: "Turnout",
      date: Timestamp.fromDate(addDays(new Date(), i)),
      startTime: i < 5 ? "09:00" : "10:00",
      duration: i < 5 ? 120 : 180,
      status: i % 3 === 0 ? "completed" : i % 3 === 1 ? "assigned" : "open",
      assignedTo:
        i % 3 !== 2 ? (i < 5 ? USER_IDS.ALICE : USER_IDS.GRACE) : null,
      assignedToName:
        i % 3 !== 2 ? (i < 5 ? "Alice Johnson" : "Grace Lee") : null,
      completedAt:
        i % 3 === 0
          ? Timestamp.fromDate(addHours(addDays(new Date(), i), 2))
          : null,
      createdAt: Timestamp.fromDate(subDays(new Date(), 7)),
      createdBy: i < 5 ? USER_IDS.ALICE : USER_IDS.EMMA,
    });
  }

  shifts.forEach((shift) => {
    const docRef = db.collection("shifts").doc();
    batch.set(docRef, { ...shift, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${shifts.length} shifts`);
}

//============================================================================
// Phase 7: Audit Trail (auditLogs)
//============================================================================

async function seedAuditLogs() {
  console.log("\n📝 Phase 7.1: Seeding auditLogs (25)...");
  const batch = db.batch();

  const logs = [
    // Organization operations
    {
      operation: "create",
      collection: "organizations",
      documentId: ORG_IDS.SUNNYDALE,
      performedBy: USER_IDS.ALICE,
      performedByName: "Alice Johnson",
      performedByEmail: "alice@sunnydale.com",
      timestamp: Timestamp.fromDate(subMonths(new Date(), 6)),
      changes: { name: "Sunnydale Stables", subscriptionTier: "professional" },
      metadata: { ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0" },
    },
    // Horse operations
    {
      operation: "create",
      collection: "horses",
      documentId: HORSE_IDS.THUNDER,
      performedBy: USER_IDS.ALICE,
      performedByName: "Alice Johnson",
      performedByEmail: "alice@sunnydale.com",
      timestamp: Timestamp.fromDate(subMonths(new Date(), 6)),
      changes: { name: "Thunder", breed: "Thoroughbred" },
      metadata: { source: "web_app" },
    },
    {
      operation: "update",
      collection: "horses",
      documentId: HORSE_IDS.STORM,
      performedBy: USER_IDS.BOB,
      performedByName: "Bob Williams",
      performedByEmail: "bob@sunnydale.com",
      timestamp: Timestamp.fromDate(subMonths(new Date(), 2)),
      changes: {
        before: { currentStableId: STABLE_IDS.TRAINING },
        after: { currentStableId: STABLE_IDS.MAIN_BARN },
      },
      metadata: { reason: "Training completed" },
    },
    // More audit logs (22 more)
    ...Array.from({ length: 22 }, (_, i) => ({
      operation: ["create", "update", "delete"][i % 3],
      collection: [
        "horses",
        "activities",
        "facilityReservations",
        "shifts",
        "organizationMembers",
      ][i % 5],
      documentId: `doc_${i}`,
      performedBy: [USER_IDS.ALICE, USER_IDS.BOB, USER_IDS.EMMA][i % 3],
      performedByName: ["Alice Johnson", "Bob Williams", "Emma Thompson"][
        i % 3
      ],
      performedByEmail: [
        "alice@sunnydale.com",
        "bob@sunnydale.com",
        "emma@greenfield.com",
      ][i % 3],
      timestamp: Timestamp.fromDate(subDays(new Date(), i + 1)),
      changes: { field: `value_${i}` },
      metadata: { source: "web_app", ipAddress: `192.168.1.${100 + i}` },
    })),
  ];

  logs.forEach((log) => {
    const docRef = db.collection("auditLogs").doc();
    batch.set(docRef, { ...log, id: docRef.id });
  });

  await batch.commit();
  console.log(`   ✅ Created ${logs.length} audit logs`);
}

//============================================================================
// Main Seeding Function
//============================================================================

async function seedDatabase() {
  console.log("🌱 Starting Comprehensive Database Seeding");
  console.log("=".repeat(60));
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`🎯 Target: ~245 documents across 20 collections\n`);

  const startTime = Date.now();

  try {
    // Phase 1: Foundation
    console.log("\n🏗️  PHASE 1: FOUNDATION");
    console.log("━".repeat(60));
    await seedUsers();
    await seedVaccinationRules();
    await seedContacts();

    // Phase 2: Organizations
    console.log("\n🏢 PHASE 2: ORGANIZATIONS");
    console.log("━".repeat(60));
    await seedOrganizations();
    await seedOrganizationMembers();
    await seedInvites();

    // Phase 3: Stables
    console.log("\n🏇 PHASE 3: STABLES");
    console.log("━".repeat(60));
    await seedStables();
    await seedStableMembers();

    // Phase 4: Horses
    console.log("\n🐴 PHASE 4: HORSES");
    console.log("━".repeat(60));
    await seedHorseGroups();
    await seedHorses();
    await seedLocationHistory();

    // Phase 5: Activities & Care
    console.log("\n🏥 PHASE 5: ACTIVITIES & CARE");
    console.log("━".repeat(60));
    await seedActivityTypes();
    await seedActivities();
    await seedVaccinationRecords();

    // Phase 6: Facilities & Scheduling
    console.log("\n📅 PHASE 6: FACILITIES & SCHEDULING");
    console.log("━".repeat(60));
    await seedFacilities();
    await seedFacilityReservations();
    await seedShiftTypesAndSchedules();
    await seedShifts();

    // Phase 7: Audit Trail
    console.log("\n📋 PHASE 7: AUDIT TRAIL");
    console.log("━".repeat(60));
    await seedAuditLogs();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(60));
    console.log(`📊 Summary:`);
    console.log(`   Duration: ${duration}s`);
    console.log(`   Collections seeded: 20 of 20 ✅`);
    console.log(`   Documents created: 228 total`);
    console.log(`     - Main collections: 215 documents`);
    console.log(`     - Subcollections: 13 locationHistory entries`);
    console.log(`\n📦 Collections breakdown:`);
    console.log(`   Phase 1: 19 docs (users, vaccinationRules, contacts)`);
    console.log(
      `   Phase 2: 13 docs (organizations, organizationMembers, invites)`,
    );
    console.log(`   Phase 3: 11 docs (stables, stableMembers)`);
    console.log(`   Phase 4: 29 docs (horseGroups, horses, locationHistory)`);
    console.log(
      `   Phase 5: 75 docs (activityTypes, activities, vaccinationRecords)`,
    );
    console.log(
      `   Phase 6: 56 docs (facilities, facilityReservations, shiftTypes, schedules, shifts)`,
    );
    console.log(`   Phase 7: 25 docs (auditLogs)`);
    console.log(`\n📅 Completed at: ${new Date().toISOString()}`);
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    throw error;
  }
}

// Run seeding
seedDatabase()
  .then(() => {
    console.log("\n🎉 Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Fatal error:", error);
    process.exit(1);
  });
