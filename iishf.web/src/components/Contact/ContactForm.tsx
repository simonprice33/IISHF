"use client";

import { useState } from "react";
import styles from "./ContactForm.module.css";

type FormState = "idle" | "submitting" | "success" | "error";

interface FormData {
  name: string;
  email: string;
  subject: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.name.trim()) errors.name = "Name is required";
  else if (data.name.length > 80) errors.name = "Name must be 80 characters or less";

  if (!data.email.trim()) errors.email = "Email is required";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    errors.email = "Please enter a valid email address";

  if (!data.subject.trim()) errors.subject = "Subject is required";
  else if (data.subject.length > 80) errors.subject = "Subject must be 80 characters or less";

  if (!data.message.trim()) errors.message = "Message is required";
  else if (data.message.length > 500) errors.message = "Message must be 500 characters or less";

  return errors;
}

export function ContactForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [formState, setFormState] = useState<FormState>("idle");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setFormState("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormState("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
        setErrors({});
      } else {
        setFormState("error");
      }
    } catch {
      setFormState("error");
    }
  }

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>

          {/* Form column */}
          <div className={styles.formCol}>
            <h2 className={styles.heading}>Message us</h2>

            {formState === "success" ? (
              <p className={styles.successMessage}>
                Your message has been submitted to IISHF Communications team and we will be
                responded to accordingly.
              </p>
            ) : (
              <form onSubmit={handleSubmit} noValidate className={styles.form}>
                <div className={styles.fieldGroup}>
                  <input
                    name="name"
                    type="text"
                    className={styles.input}
                    placeholder="Name"
                    value={formData.name}
                    onChange={handleChange}
                    maxLength={80}
                    autoComplete="name"
                  />
                  {errors.name && <span className={styles.error}>{errors.name}</span>}
                </div>

                <div className={styles.fieldGroup}>
                  <input
                    name="email"
                    type="email"
                    className={styles.input}
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                  {errors.email && <span className={styles.error}>{errors.email}</span>}
                </div>

                <div className={styles.fieldGroup}>
                  <input
                    name="subject"
                    type="text"
                    className={styles.input}
                    placeholder="Subject"
                    value={formData.subject}
                    onChange={handleChange}
                    maxLength={80}
                  />
                  {errors.subject && <span className={styles.error}>{errors.subject}</span>}
                </div>

                <div className={styles.fieldGroup}>
                  <textarea
                    name="message"
                    rows={4}
                    className={`${styles.input} ${styles.textarea}`}
                    placeholder="Message"
                    value={formData.message}
                    onChange={handleChange}
                    maxLength={500}
                  />
                  {errors.message && <span className={styles.error}>{errors.message}</span>}
                </div>

                {formState === "error" && (
                  <span className={styles.error}>
                    Something went wrong — please try again.
                  </span>
                )}

                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={formState === "submitting"}
                >
                  {formState === "submitting" ? "Sending…" : "Send message"}
                </button>
              </form>
            )}
          </div>

          {/* Policies column */}
          <div className={styles.policiesCol}>
            <h2 className={styles.heading}>Data Protection and Privacy Policies</h2>
            <p>
              <a href="/privacy/" className={styles.policyLink}>
                IISHF Privacy Policy
              </a>
            </p>
            <p>
              <a href="/general-data-protection-regulations/" className={styles.policyLink}>
                GDPR
              </a>
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
