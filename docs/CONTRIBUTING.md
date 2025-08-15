# Contributing Guide

Thank you for your interest in contributing to this project! This guide will help you get started with using, forking, and contributing back to the repository.

---

## 1. Fork and Set Up Your Own Copy

1. Navigate to the repository on GitHub.
2. Click the **Fork** button in the upper-right corner to create your own copy.
3. Clone your fork locally:

   ```bash
   git clone https://github.com/<your-username>/<repo-name>.git
   ```
4. Navigate into the project directory:

   ```bash
   cd <repo-name>
   ```
5. Set the original repository as an **upstream** remote:

   ```bash
   git remote add upstream https://github.com/<original-owner>/<repo-name>.git
   ```

---

## 2. Customize for Your Own Needs

You are encouraged to adapt this project for your own use cases. For example:

* Adding new services
* Integrating with different APIs
* Modifying configuration for your environment

Feel free to make changes in your fork as needed. This is **your copy**—make it work for you.

---

## 3. Keeping Your Fork Updated

Regularly sync your fork with the upstream repository to ensure you have the latest updates:

```bash
git fetch upstream
git checkout main
git merge upstream/main
```

---

## 4. Contributing Back

If you build something that could benefit the wider community, we encourage you to contribute it back to the original repository:

1. Create a new branch for your feature or fix:

   ```bash
   git checkout -b feature/my-new-service
   ```
2. Commit your changes with a clear, descriptive message:

   ```bash
   git add .
   git commit -m "Add new service for XYZ integration"
   ```
3. Push your branch to your fork:

   ```bash
   git push origin feature/my-new-service
   ```
4. Open a **Pull Request (PR)** from your branch in your fork to the `main` branch of the upstream repository.

When submitting a PR, please:

* Clearly describe the changes and their purpose.
* Include usage instructions if applicable.
* Ensure your code follows the style and conventions of the project.

---

## 5. Questions and Support

If you have questions or need help:

* Open a [GitHub Discussion](https://github.com/ixoworld/ixo-ussd/discussions) or [Issue](https://github.com/ixoworld/ixo-ussd/issues)
* Tag maintainers if your question is urgent.

---

**Happy hacking!** We look forward to seeing what you build and share.
