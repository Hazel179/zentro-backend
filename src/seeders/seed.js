const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Category = require('../models/Category');
const Consultant = require('../models/Consultant');
const Booking = require('../models/Booking');
const Service = require('../models/Service');

// New Categories: Businesses, Healthcare, Technology, and Personal Growth
const wellnessCategories = [
  {
    name: 'Businesses',
    description: 'Comprehensive business consulting services including strategy, operations, marketing, and growth planning for companies of all sizes.',
    color: '#2563EB',
    icon: 'fa-briefcase',
    active: true
  },
  {
    name: 'Healthcare',
    description: 'Professional healthcare consulting services covering medical practice management, patient care optimization, and healthcare technology implementation.',
    color: '#DC2626',
    icon: 'fa-heartbeat',
    active: true
  },
  {
    name: 'Technology',
    description: 'Expert technology consulting for digital transformation, software development, IT infrastructure, and emerging tech solutions.',
    color: '#7C3AED',
    icon: 'fa-laptop-code',
    active: true
  },
  {
    name: 'Personal Growth',
    description: 'Personal development and life coaching services to help individuals achieve their goals, improve skills, and enhance overall well-being.',
    color: '#059669',
    icon: 'fa-user-graduate',
    active: true
  }
];

const dubaiFemaleNames = [
  { firstName: 'Aisha', lastName: 'Al Mansouri' },
  { firstName: 'Fatima', lastName: 'Al Qassimi' },
  { firstName: 'Mariam', lastName: 'Al Falasi' },
  { firstName: 'Layla', lastName: 'Al Suwaidi' },
  { firstName: 'Noor', lastName: 'Al Maktoum' },
  { firstName: 'Zara', lastName: 'Al Nahyan' },
  { firstName: 'Yasmin', lastName: 'Al Hashimi' },
  { firstName: 'Amira', lastName: 'Al Zaabi' },
  { firstName: 'Sara', lastName: 'Al Shamsi' },
  { firstName: 'Hana', lastName: 'Al Ameri' },
  { firstName: 'Rania', lastName: 'Al Ketbi' },
  { firstName: 'Dalia', lastName: 'Al Mazrouei' },
  { firstName: 'Nadine', lastName: 'Al Hameli' },
  { firstName: 'Lina', lastName: 'Al Dhaheri' },
  { firstName: 'Maya', lastName: 'Al Romaithi' },
  { firstName: 'Salma', lastName: 'Al Qubaisi' },
  { firstName: 'Amina', lastName: 'Al Shehhi' },
  { firstName: 'Khadija', lastName: 'Al Nuaimi' },
  { firstName: 'Reem', lastName: 'Al Khoori' },
  { firstName: 'Nour', lastName: 'Al Marzouqi' }
];

const dubaiLocations = [
  'Downtown Dubai',
  'Dubai Marina',
  'Palm Jumeirah',
  'Business Bay',
  'Dubai Internet City',
  'Dubai Media City',
  'Dubai Healthcare City',
  'Dubai Knowledge Park',
  'Dubai Silicon Oasis',
  'Dubai World Trade Centre'
];

const dubaiCompanies = [
  'Dubai Holding',
  'Emirates Group',
  'Dubai World',
  'Meraas Holding',
  'Dubai Properties',
  'Dubai Multi Commodities Centre',
  'Dubai International Financial Centre',
  'Dubai Future Foundation',
  'Dubai Chamber of Commerce',
  'Dubai Tourism'
];

const dubaiUniversities = [
  'American University in Dubai',
  'University of Dubai',
  'Heriot-Watt University Dubai',
  'Rochester Institute of Technology Dubai',
  'Middlesex University Dubai',
  'BITS Pilani Dubai',
  'Manipal University Dubai',
  'Amity University Dubai',
  'University of Birmingham Dubai',
  'Murdoch University Dubai'
];

const mockServices = [
  // Business Strategy
  {
    title: 'Market Entry Strategy',
    description: 'Comprehensive analysis of the UAE market landscape, competitive advantages, and strategic recommendations for entering or expanding in Dubai.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Businesses',
    duration: '60 min',
    price: 150,
    rating: 4.9
  },
  {
    title: 'Digital Transformation',
    description: 'Strategic planning and implementation of digital initiatives to enhance operational efficiency, customer engagement, and market reach.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Businesses',
    duration: '90 min',
    price: 200,
    rating: 4.8
  },
  {
    title: 'Growth Planning',
    description: 'Developing actionable plans to achieve business growth, market expansion, and revenue optimization across various sectors.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Businesses',
    duration: '120 min',
    price: 250,
    rating: 4.9
  },
  
  // Healthcare
  {
    title: 'Medical Practice Management',
    description: 'Strategic planning and operational support for healthcare providers to improve patient flow, reduce costs, and enhance clinical outcomes.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Healthcare',
    duration: '60 min',
    price: 100,
    rating: 4.7
  },
  {
    title: 'Patient Care Optimization',
    description: 'Strategies to improve patient satisfaction, retention, and overall healthcare experience through innovative patient engagement and care delivery.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Healthcare',
    duration: '90 min',
    price: 120,
    rating: 4.8
  },
  {
    title: 'Healthcare Technology Implementation',
    description: 'Assistance in selecting, integrating, and optimizing healthcare IT solutions to improve patient care, operational efficiency, and data security.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Healthcare',
    duration: '120 min',
    price: 150,
    rating: 4.9
  },
  
  // Technology
  {
    title: 'Software Development',
    description: 'End-to-end software development services for web, mobile, and enterprise applications, including custom solutions and maintenance.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Technology',
    duration: '90 min',
    price: 180,
    rating: 4.8
  },
  {
    title: 'IT Infrastructure',
    description: 'Design, implementation, and management of robust IT infrastructure, including servers, networks, and data storage solutions.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Technology',
    duration: '120 min',
    price: 200,
    rating: 4.9
  },
  {
    title: 'Emerging Tech Solutions',
    description: 'Exploration and implementation of cutting-edge technologies such as AI, blockchain, and IoT to drive innovation and efficiency.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Technology',
    duration: '150 min',
    price: 250,
    rating: 4.9
  },
  
  // Personal Growth
  {
    title: 'Life Coaching',
    description: 'One-on-one coaching sessions to help individuals achieve their personal and professional goals, develop self-awareness, and enhance overall well-being.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Personal Growth',
    duration: '60 min',
    price: 80,
    rating: 4.7
  },
  {
    title: 'Skill Enhancement',
    description: 'Focused training and development programs to improve specific skills, enhance productivity, and achieve career advancement.',
    image: 'https://images.unsplash.com/photo-1517960413843-0aee8e2d471c?auto=format&fit=crop&w=800&q=80',
    category: 'Personal Growth',
    duration: '90 min',
    price: 100,
    rating: 4.8
  },
  {
    title: 'Wellness Workshops',
    description: 'Workshops on mindfulness, stress management, and holistic health. Gain valuable insights and practical tools to enhance your well-being.',
    image: 'https://images.unsplash.com/photo-1545389336-cf0906944354?auto=format&fit=crop&w=800&q=80',
    category: 'Personal Growth',
    duration: '90 min',
    price: 40,
    rating: 4.9
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 MongoDB Connected for seeding...');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearData = async () => {
  try {
    await User.deleteMany({});
    await Category.deleteMany({});
    await Consultant.deleteMany({});
    await Booking.deleteMany({});
    await Service.deleteMany({});
    console.log('🗑️  Existing data cleared');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
};

// Seed categories
const seedCategories = async () => {
  try {
    const categories = await Category.insertMany(wellnessCategories);
    console.log(`✅ ${categories.length} categories seeded`);
    return categories;
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    return [];
  }
};

// Create admin user
const createAdminUser = async () => {
  try {
    // Always remove any existing admin user to avoid duplicates or stale passwords
    await User.deleteMany({ email: 'admin@zentro.com' });
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10); // bcryptjs, 10 rounds
    console.log('DEBUG: Admin password (plaintext):', adminPassword);
    console.log('DEBUG: Admin password (bcryptjs hash):', hashedPassword);
    const adminUser = await User.create({
      firstName: 'Admin',
      lastName: 'Zentro',
      email: 'admin@zentro.com',
      password: hashedPassword,
      role: 'admin',
      phone: '+971501234567',
      isActive: true,
      emailVerified: true
    });
    console.log('✅ Admin user created');
    return adminUser;
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    return null;
  }
};

// Create client users
const createClientUsers = async () => {
  try {
    const clients = [];
    const hashedPassword = await bcrypt.hash('client123', 12);
    
    for (let i = 0; i < 10; i++) {
      const client = await User.create({
        firstName: dubaiFemaleNames[i].firstName,
        lastName: dubaiFemaleNames[i].lastName,
        email: `client${i + 1}@zentro.com`,
        password: hashedPassword,
        role: 'client',
        phone: `+97150${String(i + 1).padStart(7, '0')}`,
        isActive: true,
        emailVerified: true,
        location: dubaiLocations[Math.floor(Math.random() * dubaiLocations.length)]
      });
      clients.push(client);
    }
    console.log(`✅ ${clients.length} client users created`);
    return clients;
  } catch (error) {
    console.error('❌ Error creating client users:', error);
    return [];
  }
};

// Utility to shuffle an array
function shuffleArray(array) {
  const arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Create consultant users and profiles
const createConsultants = async (categories) => {
  try {
    const consultants = [];
    const hashedPassword = await bcrypt.hash('consultant123', 12);
    
    // Find the Yoga Classes category object
    const yogaCategory = categories.find(cat => cat.name === 'Yoga Classes');
    
    for (let i = 10; i < dubaiFemaleNames.length; i++) {
      const name = dubaiFemaleNames[i];
      const user = await User.create({
        firstName: name.firstName,
        lastName: name.lastName,
        email: `consultant${i - 9}@zentro.com`,
        password: hashedPassword,
        role: 'consultant',
        phone: `+97150${String(i + 1).padStart(7, '0')}`,
        isActive: true,
        emailVerified: true,
        location: dubaiLocations[Math.floor(Math.random() * dubaiLocations.length)]
      });

      // All consultants available 24/7
      const availability = {
        monday:    { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        tuesday:   { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        wednesday: { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        thursday:  { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        friday:    { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        saturday:  { isAvailable: true, startTime: '00:00', endTime: '23:59' },
        sunday:    { isAvailable: true, startTime: '00:00', endTime: '23:59' }
      };

      // Shuffle categories and pick a random number for each consultant
      const shuffledCategories = shuffleArray(categories);
      const numCategories = Math.floor(Math.random() * 3) + 1; // 1 to 3 categories
      let consultantCategories = shuffledCategories.slice(0, numCategories);
      // Ensure Yoga Classes is always included
      if (yogaCategory && !consultantCategories.some(cat => cat._id.equals(yogaCategory._id))) {
        consultantCategories.push(yogaCategory);
      }

      const consultant = await Consultant.create({
        user: user._id,
        categories: consultantCategories.map(cat => cat._id),
        bio: generateBio(name.firstName, consultantCategories[0].name),
        experience: Math.floor(Math.random() * 15) + 5,
        hourlyRate: Math.floor(Math.random() * 200) + 100,
        isActive: true,
        totalBookings: Math.floor(Math.random() * 50) + 10,
        completedBookings: Math.floor(Math.random() * 45) + 8,
        completionRate: Math.floor(Math.random() * 20) + 80,
        languages: ['English', 'Arabic'],
        qualifications: generateQualifications(name.firstName),
        certifications: generateCertifications(),
        specializations: generateSpecializations(consultantCategories[0].name),
        achievements: generateAchievements(name.firstName),
        availability,
        rating: {
          average: (Math.random() * 1.5 + 3.5).toFixed(1), // 3.5 to 5.0
          count: Math.floor(Math.random() * 96) + 5 // 5 to 100
        }
      });

      consultants.push({ user, consultant });
    }
    console.log(`✅ ${consultants.length} consultant profiles created`);
    return consultants;
  } catch (error) {
    console.error('❌ Error creating consultants:', error);
    return [];
  }
};

// Generate realistic bio
const generateBio = (firstName, category) => {
  const bios = {
    'Businesses': `${firstName} is a seasoned business consultant with over 10 years of experience in strategic planning, market analysis, and business development. She specializes in helping companies of all sizes optimize their operations, expand their market reach, and achieve sustainable growth.`,
    'Healthcare': `${firstName} is a healthcare management expert with extensive experience in medical practice optimization, patient care enhancement, and healthcare technology implementation. She helps healthcare providers improve efficiency, patient satisfaction, and clinical outcomes.`,
    'Technology': `${firstName} is a technology consultant and digital transformation specialist with expertise in software development, IT infrastructure, and emerging technologies. She helps organizations leverage technology to drive innovation and operational excellence.`,
    'Personal Growth': `${firstName} is a certified life coach and personal development expert who specializes in helping individuals achieve their goals, overcome challenges, and enhance their overall well-being. She provides personalized coaching and practical strategies for personal and professional growth.`
  };
  return bios[category] || `${firstName} is an experienced consultant specializing in ${category}. With a proven track record of helping clients achieve their goals, she provides personalized solutions and expert guidance.`;
};

// Generate qualifications
const generateQualifications = (firstName) => {
  const universities = dubaiUniversities.slice(0, 3);
  return [
    {
      name: 'Master of Business Administration',
      institution: universities[0],
      year: 2018
    },
    {
      name: 'Bachelor of Commerce',
      institution: universities[1],
      year: 2015
    }
  ];
};

// Generate certifications
const generateCertifications = () => {
  return [
    {
      name: 'Dubai Chamber of Commerce Certification',
      issuingBody: 'Dubai Chamber of Commerce',
      issueDate: '2022-01-15'
    },
    {
      name: 'UAE Business License',
      issuingBody: 'Department of Economic Development',
      issueDate: '2021-06-20'
    }
  ];
};

// Generate specializations
const generateSpecializations = (category) => {
  const universalTopics = [
    'Strategic Planning',
    'Performance Optimization',
    'Innovation Management',
    'Client Relationship Management',
    'Quality Assurance',
    'Risk Management',
    'Continuous Improvement'
  ];
  const specializations = {
    'Businesses': [
      'Market Entry Strategy',
      'Digital Transformation',
      'Growth Planning',
      'Business Strategy',
      'Operations Management',
      'Financial Planning',
      'Marketing Strategy',
      'Human Resources',
      'Supply Chain Management',
      'International Business'
    ],
    'Healthcare': [
      'Medical Practice Management',
      'Patient Care Optimization',
      'Healthcare Technology Implementation',
      'Clinical Operations',
      'Healthcare Compliance',
      'Medical Device Management',
      'Healthcare Marketing',
      'Patient Experience',
      'Healthcare Analytics',
      'Telemedicine Solutions'
    ],
    'Technology': [
      'Software Development',
      'IT Infrastructure',
      'Emerging Tech Solutions',
      'Cloud Computing',
      'Cybersecurity',
      'Data Analytics',
      'Artificial Intelligence',
      'Mobile Development',
      'Web Development',
      'DevOps Implementation'
    ],
    'Personal Growth': [
      'Life Coaching',
      'Skill Enhancement',
      'Wellness Workshops',
      'Leadership Development',
      'Communication Skills',
      'Time Management',
      'Goal Setting',
      'Stress Management',
      'Career Planning',
      'Personal Branding'
    ]
  };
  return specializations[category] || universalTopics;
};

// Generate achievements
const generateAchievements = (firstName) => {
  return [
    `Led successful business transformation for ${dubaiCompanies[Math.floor(Math.random() * dubaiCompanies.length)]}`,
    'Recognized as Top Consultant by Dubai Business Awards 2023',
    'Published research on Dubai market trends in leading business journals',
    'Mentored 50+ startups in Dubai startup ecosystem'
  ];
};

// Generate availability
const generateAvailability = () => {
  return {
    monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
    tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
    wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
    thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
    friday: { isAvailable: false, startTime: '', endTime: '' },
    saturday: { isAvailable: true, startTime: '10:00', endTime: '15:00' },
    sunday: { isAvailable: false, startTime: '', endTime: '' }
  };
};

// Create sample bookings
const createBookings = async (clients, consultants, categories) => {
  try {
    const bookings = [];
    const meetingTypes = ['video', 'audio', 'in-person'];
    const statuses = ['completed', 'confirmed', 'pending'];
    const startTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
    
    for (let i = 0; i < 20; i++) {
      const client = clients[Math.floor(Math.random() * clients.length)];
      const consultantData = consultants[Math.floor(Math.random() * consultants.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const startTime = startTimes[Math.floor(Math.random() * startTimes.length)];
      const duration = [30, 60, 90][Math.floor(Math.random() * 3)];
      
      // Calculate end time
      const startTimeDate = new Date(`2000-01-01T${startTime}:00`);
      const endTimeDate = new Date(startTimeDate.getTime() + duration * 60000);
      const endTime = endTimeDate.toTimeString().slice(0, 5);
      
      const booking = await Booking.create({
        client: client._id,
        consultant: consultantData.consultant._id,
        category: category._id,
        date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000),
        startTime: startTime,
        endTime: endTime,
        duration: duration,
        meetingType: meetingTypes[Math.floor(Math.random() * meetingTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        totalAmount: (consultantData.consultant.hourlyRate * duration) / 60,
        location: dubaiLocations[Math.floor(Math.random() * dubaiLocations.length)],
        notes: {
          client: 'Dubai market analysis and business strategy consultation',
          consultant: 'Comprehensive consultation session scheduled'
        }
      });
      bookings.push(booking);
    }
    console.log(`✅ ${bookings.length} sample bookings created`);
    return bookings;
  } catch (error) {
    console.error('❌ Error creating bookings:', error);
    return [];
  }
};

const seedServices = async () => {
  try {
    await Service.deleteMany({});
    await Service.insertMany(mockServices);
    console.log('✅ Mock services seeded');
  } catch (error) {
    console.error('❌ Error seeding services:', error);
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    
    await connectDB();
    await clearData();
    
    const categories = await seedCategories();
    const adminUser = await createAdminUser();
    const clients = await createClientUsers();
    const consultants = await createConsultants(categories);
    const bookings = await createBookings(clients, consultants, categories);
    await seedServices();
    
    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • ${categories.length} categories`);
    console.log(`   • 1 admin user`);
    console.log(`   • ${clients.length} client users`);
    console.log(`   • ${consultants.length} consultant profiles`);
    console.log(`   • ${bookings.length} sample bookings`);
    console.log(`   • ${mockServices.length} mock services`);
    
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@zentro.com / admin123');
    console.log('   Client: client1@zentro.com / client123');
    console.log('   Consultant: consultant1@zentro.com / consultant123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeder
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 
module.exports = { seedDatabase }; 