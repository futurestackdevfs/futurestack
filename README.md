# Future Stack Project

# 1. Clone the repo
git clone https://github.com/yourusername/future-stack.git

# 2. Go into the project
cd future-stack

# 3. Install pnpm if not already installed
npm install -g pnpm

# 4. Install all dependencies from root
pnpm install

# 5. Start frontend
cd apps/web
pnpm dev

# 6. Start backend (new terminal)
cd apps/api
pnpm start:dev