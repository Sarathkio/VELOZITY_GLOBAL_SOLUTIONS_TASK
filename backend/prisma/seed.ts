import { PrismaClient, Role, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // ─── Clean existing data ───────────────────────────────────────────────────
  await prisma.notification.deleteMany();
  await prisma.taskActivity.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.client.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  // ─── Users ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('Password123!', 12);

  const admin = await prisma.user.create({
    data: {
      name: 'Alex Administrator',
      email: 'admin@velozity.dev',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const pm1 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya@velozity.dev',
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const pm2 = await prisma.user.create({
    data: {
      name: 'Marco Rossi',
      email: 'marco@velozity.dev',
      passwordHash,
      role: Role.PROJECT_MANAGER,
    },
  });

  const dev1 = await prisma.user.create({
    data: {
      name: 'Ravi Kumar',
      email: 'ravi@velozity.dev',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev2 = await prisma.user.create({
    data: {
      name: 'Aisha Patel',
      email: 'aisha@velozity.dev',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev3 = await prisma.user.create({
    data: {
      name: 'Chen Wei',
      email: 'chen@velozity.dev',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  const dev4 = await prisma.user.create({
    data: {
      name: 'Sara Johansson',
      email: 'sara@velozity.dev',
      passwordHash,
      role: Role.DEVELOPER,
    },
  });

  console.log('✅ Users created');

  // ─── Clients ──────────────────────────────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      name: 'FinTech Solutions Ltd',
      email: 'contact@fintechsolutions.com',
      phone: '+1 (555) 100-2000',
      company: 'FinTech Solutions Ltd',
      notes: 'Premium client. Requires weekly status updates.',
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name: 'RetailPro Inc',
      email: 'info@retailpro.com',
      phone: '+1 (555) 200-3000',
      company: 'RetailPro Inc',
      notes: 'E-commerce focused. Tight deadlines.',
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name: 'HealthCare Connect',
      email: 'dev@healthcareconnect.io',
      phone: '+1 (555) 300-4000',
      company: 'HealthCare Connect',
      notes: 'HIPAA compliance required. Security-first approach.',
    },
  });

  console.log('✅ Clients created');

  // ─── Helper dates ──────────────────────────────────────────────────────────
  const now = new Date();
  const past = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const future = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  // ─── Projects ─────────────────────────────────────────────────────────────

  // PROJECT 1 — PM1 (Priya) + FinTech
  const project1 = await prisma.project.create({
    data: {
      name: 'FinTech Mobile Banking App',
      description: 'Native mobile banking application with real-time transactions, biometric auth, and portfolio tracking.',
      clientId: client1.id,
      createdById: pm1.id,
    },
  });

  // PROJECT 2 — PM1 (Priya) + RetailPro
  const project2 = await prisma.project.create({
    data: {
      name: 'RetailPro E-Commerce Platform',
      description: 'Full e-commerce rebuild with microservices architecture, real-time inventory, and AI-powered recommendations.',
      clientId: client2.id,
      createdById: pm1.id,
    },
  });

  // PROJECT 3 — PM2 (Marco) + HealthCare
  const project3 = await prisma.project.create({
    data: {
      name: 'HealthCare Patient Portal',
      description: 'HIPAA-compliant patient portal with appointment scheduling, medical records, and telemedicine.',
      clientId: client3.id,
      createdById: pm2.id,
    },
  });

  console.log('✅ Projects created');

  // ─── Tasks — Project 1 (FinTech Mobile Banking) ───────────────────────────
  const task1_1 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Implement biometric authentication',
      description: 'Integrate Face ID and fingerprint authentication for iOS and Android using device native APIs.',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: future(5),
    },
  });

  const task1_2 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Real-time transaction feed WebSocket',
      description: 'Implement WebSocket connection to receive real-time transaction updates from core banking system.',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: future(10),
    },
  });

  const task1_3 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Portfolio dashboard charts',
      description: 'Build interactive charts for portfolio overview using D3.js with real-time data updates.',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: past(1), // OVERDUE
      isOverdue: true,
    },
  });

  const task1_4 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Card management screen',
      description: 'Virtual and physical card management — freeze, unfreeze, set limits, and transaction controls.',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: past(5),
    },
  });

  const task1_5 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Push notification service integration',
      description: 'Integrate FCM for Android and APNs for iOS to deliver transaction alerts and security notifications.',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: future(14),
    },
  });

  const task1_6 = await prisma.task.create({
    data: {
      projectId: project1.id,
      title: 'Bank statement PDF generation',
      description: 'Generate downloadable PDF statements for any date range with transaction history.',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: future(21),
    },
  });

  // ─── Tasks — Project 2 (RetailPro E-Commerce) ────────────────────────────
  const task2_1 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Product catalogue microservice',
      description: 'Design and build the product catalogue service with Elasticsearch integration for search.',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: future(7),
    },
  });

  const task2_2 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Shopping cart service',
      description: 'Redis-backed shopping cart with cross-device sync and abandoned cart recovery.',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: past(3), // OVERDUE
      isOverdue: true,
    },
  });

  const task2_3 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Payment gateway integration',
      description: 'Stripe and PayPal integration with PCI-DSS compliance, 3DS2 support.',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.TODO,
      priority: Priority.CRITICAL,
      dueDate: future(12),
    },
  });

  const task2_4 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Order fulfillment workflow',
      description: 'State machine for order lifecycle: pending → confirmed → shipped → delivered → completed.',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: future(3),
    },
  });

  const task2_5 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'Inventory management dashboard',
      description: 'Real-time inventory tracking with low stock alerts and automated reorder triggers.',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: past(7),
    },
  });

  const task2_6 = await prisma.task.create({
    data: {
      projectId: project2.id,
      title: 'AI recommendation engine',
      description: 'Collaborative filtering model for personalized product recommendations.',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.TODO,
      priority: Priority.LOW,
      dueDate: future(30),
    },
  });

  // ─── Tasks — Project 3 (HealthCare Patient Portal) ───────────────────────
  const task3_1 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'HIPAA-compliant data encryption',
      description: 'End-to-end encryption for all PHI data at rest and in transit. AES-256 implementation.',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.CRITICAL,
      dueDate: future(3),
    },
  });

  const task3_2 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'Appointment scheduling system',
      description: 'Online appointment booking with calendar integration, reminders, and conflict detection.',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.IN_REVIEW,
      priority: Priority.HIGH,
      dueDate: future(8),
    },
  });

  const task3_3 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'Telemedicine video consultation',
      description: 'WebRTC-based video consultation with recording capability and prescription generation.',
      assignedDeveloperId: dev1.id,
      status: TaskStatus.TODO,
      priority: Priority.HIGH,
      dueDate: future(15),
    },
  });

  const task3_4 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'Medical records viewer',
      description: 'Secure viewer for FHIR-compliant medical records with search and filtering.',
      assignedDeveloperId: dev3.id,
      status: TaskStatus.DONE,
      priority: Priority.MEDIUM,
      dueDate: past(10),
    },
  });

  const task3_5 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'Insurance claim portal',
      description: 'Online insurance claim submission with document upload and status tracking.',
      assignedDeveloperId: dev4.id,
      status: TaskStatus.TODO,
      priority: Priority.MEDIUM,
      dueDate: future(20),
    },
  });

  const task3_6 = await prisma.task.create({
    data: {
      projectId: project3.id,
      title: 'Audit log and compliance reporting',
      description: 'Comprehensive audit trail for all PHI access with HIPAA compliance reports.',
      assignedDeveloperId: dev2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: Priority.HIGH,
      dueDate: past(2), // OVERDUE
      isOverdue: true,
    },
  });

  console.log('✅ Tasks created (including 3 overdue tasks)');

  // ─── Activity Log ─────────────────────────────────────────────────────────
  // Create realistic historical activity

  const activities = [
    // Project 1 activities
    { taskId: task1_4.id, projectId: project1.id, userId: dev2.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(10) },
    { taskId: task1_4.id, projectId: project1.id, userId: dev2.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(8) },
    { taskId: task1_4.id, projectId: project1.id, userId: pm1.id, oldStatus: TaskStatus.IN_REVIEW, newStatus: TaskStatus.DONE, action: 'STATUS_CHANGED', createdAt: past(5) },
    { taskId: task1_3.id, projectId: project1.id, userId: dev1.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(7) },
    { taskId: task1_3.id, projectId: project1.id, userId: dev1.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(2) },
    { taskId: task1_1.id, projectId: project1.id, userId: dev1.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(3) },

    // Project 2 activities
    { taskId: task2_5.id, projectId: project2.id, userId: dev3.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(14) },
    { taskId: task2_5.id, projectId: project2.id, userId: dev3.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(10) },
    { taskId: task2_5.id, projectId: project2.id, userId: pm1.id, oldStatus: TaskStatus.IN_REVIEW, newStatus: TaskStatus.DONE, action: 'STATUS_CHANGED', createdAt: past(7) },
    { taskId: task2_4.id, projectId: project2.id, userId: dev4.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(5) },
    { taskId: task2_4.id, projectId: project2.id, userId: dev4.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(1) },
    { taskId: task2_1.id, projectId: project2.id, userId: dev1.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(4) },
    { taskId: task2_2.id, projectId: project2.id, userId: dev2.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(6) },

    // Project 3 activities
    { taskId: task3_4.id, projectId: project3.id, userId: dev3.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(20) },
    { taskId: task3_4.id, projectId: project3.id, userId: dev3.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(15) },
    { taskId: task3_4.id, projectId: project3.id, userId: pm2.id, oldStatus: TaskStatus.IN_REVIEW, newStatus: TaskStatus.DONE, action: 'STATUS_CHANGED', createdAt: past(10) },
    { taskId: task3_2.id, projectId: project3.id, userId: dev4.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(8) },
    { taskId: task3_2.id, projectId: project3.id, userId: dev4.id, oldStatus: TaskStatus.IN_PROGRESS, newStatus: TaskStatus.IN_REVIEW, action: 'STATUS_CHANGED', createdAt: past(2) },
    { taskId: task3_1.id, projectId: project3.id, userId: dev2.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(4) },
    { taskId: task3_6.id, projectId: project3.id, userId: dev2.id, oldStatus: TaskStatus.TODO, newStatus: TaskStatus.IN_PROGRESS, action: 'STATUS_CHANGED', createdAt: past(5) },
  ];

  for (const activity of activities) {
    await prisma.taskActivity.create({ data: activity });
  }

  // Overdue flagging activities
  await prisma.taskActivity.create({
    data: {
      taskId: task1_3.id,
      projectId: project1.id,
      userId: pm1.id,
      action: 'OVERDUE_FLAGGED',
      metadata: { dueDate: task1_3.dueDate?.toISOString(), flaggedAt: past(0).toISOString() },
      createdAt: past(0),
    },
  });
  await prisma.taskActivity.create({
    data: {
      taskId: task2_2.id,
      projectId: project2.id,
      userId: pm1.id,
      action: 'OVERDUE_FLAGGED',
      metadata: { dueDate: task2_2.dueDate?.toISOString(), flaggedAt: past(3).toISOString() },
      createdAt: past(3),
    },
  });
  await prisma.taskActivity.create({
    data: {
      taskId: task3_6.id,
      projectId: project3.id,
      userId: pm2.id,
      action: 'OVERDUE_FLAGGED',
      metadata: { dueDate: task3_6.dueDate?.toISOString(), flaggedAt: past(2).toISOString() },
      createdAt: past(2),
    },
  });

  console.log('✅ Activity records created');

  // ─── Notifications ────────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { recipientId: dev1.id, type: 'TASK_ASSIGNED', message: 'You were assigned task "Implement biometric authentication"', relatedTaskId: task1_1.id, relatedProjectId: project1.id },
      { recipientId: dev2.id, type: 'TASK_ASSIGNED', message: 'You were assigned task "Real-time transaction feed WebSocket"', relatedTaskId: task1_2.id, relatedProjectId: project1.id },
      { recipientId: pm1.id, type: 'TASK_IN_REVIEW', message: 'Task "Portfolio dashboard charts" has been moved to In Review', relatedTaskId: task1_3.id, relatedProjectId: project1.id },
      { recipientId: dev2.id, type: 'TASK_OVERDUE', message: 'Task "Shopping cart service" in project "RetailPro E-Commerce Platform" is overdue', relatedTaskId: task2_2.id, relatedProjectId: project2.id },
      { recipientId: pm1.id, type: 'TASK_OVERDUE', message: 'Task "Shopping cart service" is overdue', relatedTaskId: task2_2.id, relatedProjectId: project2.id },
      { recipientId: pm1.id, type: 'TASK_IN_REVIEW', message: 'Task "Order fulfillment workflow" has been moved to In Review', relatedTaskId: task2_4.id, relatedProjectId: project2.id },
      { recipientId: pm2.id, type: 'TASK_IN_REVIEW', message: 'Task "Appointment scheduling system" has been moved to In Review', relatedTaskId: task3_2.id, relatedProjectId: project3.id },
      { recipientId: dev2.id, type: 'TASK_OVERDUE', message: 'Task "Audit log and compliance reporting" is overdue', relatedTaskId: task3_6.id, relatedProjectId: project3.id },
      { recipientId: pm2.id, type: 'TASK_OVERDUE', message: 'Task "Audit log and compliance reporting" is overdue', relatedTaskId: task3_6.id, relatedProjectId: project3.id },
    ],
  });

  console.log('✅ Notifications created');

  console.log('\n🎉 Seed completed successfully!\n');
  console.log('═══════════════════════════════════════════════');
  console.log('SEED CREDENTIALS (all use Password123!)');
  console.log('═══════════════════════════════════════════════');
  console.log('Admin:           admin@velozity.dev');
  console.log('Project Manager: priya@velozity.dev');
  console.log('Project Manager: marco@velozity.dev');
  console.log('Developer:       ravi@velozity.dev');
  console.log('Developer:       aisha@velozity.dev');
  console.log('Developer:       chen@velozity.dev');
  console.log('Developer:       sara@velozity.dev');
  console.log('═══════════════════════════════════════════════\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
