# Wearify – AI Virtual Try-On Platform

Wearify is an **AI-powered Virtual Try-On platform** that allows users to digitally try garments on their own photos before making clothing decisions. The system uses deep learning models to intelligently place garments on a user's uploaded image and generate realistic results.

This project was developed as a **Final Year Project (FYP)** and combines modern web technologies with computer vision and deep learning techniques.

Live Website : https://wearify-vton.vercel.app/

---

# 🚀 Features

## 1️⃣ Virtual Try-On
Users can upload their photo and select a garment from the available collection. The system generates a new image where the selected garment is realistically applied to the user.

### Workflow
1. User registers on the platform  
2. The system provides **120 free points** to the user  
3. User uploads their image  
4. User selects a garment  
5. User clicks the **Try On** button  
6. The AI generates a new image where the garment is applied  
7. **40 points are deducted per generation**

---

## 2️⃣ AI-Based Garment Suggestions
Wearify also provides **AI-powered clothing recommendations**.

The system analyzes:
- Skin tone
- Body type

Based on these attributes, the AI suggests garments that may suit the user best. Users can directly try these recommended garments using the try-on feature.

---

# 🧠 AI & Deep Learning Components

The AI pipeline is implemented in **Python** and uses several computer vision and deep learning techniques:

- **SegFormer** – used for semantic segmentation
- **PyTorch** – deep learning framework
- **Diffusion Model** – used for generating realistic try-on results
- **Custom Dataset** – trained on a self-collected dataset

These models work together to:
- Detect the human body
- Segment clothing areas
- Generate realistic virtual try-on images

---

# 🛠 Tech Stack

## Frontend
- Next.js
- React.js
- TypeScript
- Tailwind CSS
- Vercel

## Backend
- Node.js
- Express.js
- MongoDB Atlas
- Render

## AI / Machine Learning
- Python
- PyTorch
- SegFormer
- Diffusion Models

---

# ⚙️ System Architecture

Wearify is built using a **full-stack architecture**:

Frontend (Next.js / React)  
⬇  
Backend API (Node.js / Express)  
⬇  
Database (MongoDB Atlas)  
⬇  
AI Processing Server (Python + PyTorch)

The backend manages:
- User authentication
- Image uploads
- Points system
- API communication with the AI server

The Python AI pipeline processes images and generates the virtual try-on results.

---

# 👤 User Flow

1. User registers an account
2. System assigns **120 points**
3. User uploads their image
4. User selects a garment
5. AI generates the try-on image
6. **40 points are deducted per try-on**
7. AI suggests clothing styles based on the user's appearance

---
#Live Demo
https://wearify-mu.vercel.app/

# 👨‍💻 Authors

This project is under development as a **Final Year Project (FYP)** by the Wearify development team.
