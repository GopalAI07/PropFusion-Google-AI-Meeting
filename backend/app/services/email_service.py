import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional
from fastapi import HTTPException
from jinja2 import Template

from ..config.settings import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.email_from = settings.EMAIL_FROM

    def _create_connection(self) -> smtplib.SMTP:
        """Create SMTP connection."""
        try:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls()
            if self.smtp_username and self.smtp_password:
                server.login(self.smtp_username, self.smtp_password)
            return server
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Email service connection failed: {str(e)}",
            )

    def _send_email(
        self,
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """Send an email to specified recipients."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.email_from
            msg["To"] = ", ".join(to_emails)

            # Plain text version
            if text_content:
                msg.attach(MIMEText(text_content, "plain"))

            # HTML version
            msg.attach(MIMEText(html_content, "html"))

            server = self._create_connection()
            server.sendmail(self.email_from, to_emails, msg.as_string())
            server.quit()

            logger.info(f"Email sent successfully to {to_emails}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False

    def send_welcome_email(self, to_email: str, username: str) -> bool:
        """Send welcome email to new users."""
        subject = "Welcome to AI Meeting Hub!"
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head><style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 10px 20px; background: #667eea; 
                      color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to AI Meeting Hub!</h1>
                </div>
                <div class="content">
                    <h2>Hello {{ username }}!</h2>
                    <p>Thank you for joining AI Meeting Hub. We're excited to have you on board!</p>
                    <p>With our platform, you can:</p>
                    <ul>
                        <li>Record and transcribe meetings automatically</li>
                        <li>Get AI-powered meeting summaries</li>
                        <li>Extract action items and key decisions</li>
                        <li>Collaborate with your team in real-time</li>
                    </ul>
                    <p>
                        <a href="#" class="button">Get Started</a>
                    </p>
                </div>
                <div class="footer">
                    <p>&copy; 2026 AI Meeting Hub. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = html_template.render(username=username)
        return self._send_email([to_email], subject, html_content)

    def send_meeting_summary(self, to_email: str, meeting_title: str, summary_text: str, meeting_link: str) -> bool:
        """Send meeting summary email to participants."""
        subject = f"Meeting Summary: {meeting_title}"
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head><style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; 
                      text-align: center; border-radius: 10px; }
            .content { padding: 20px; }
            .summary-box { background: #f5f5f5; padding: 15px; border-radius: 5px; 
                           margin: 15px 0; }
            .button { display: inline-block; padding: 10px 20px; background: #667eea; 
                      color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Meeting Summary</h1>
                </div>
                <div class="content">
                    <h2>{{ meeting_title }}</h2>
                    <div class="summary-box">
                        <p>{{ summary_text }}</p>
                    </div>
                    <p>
                        <a href="{{ meeting_link }}" class="button">View Full Summary</a>
                    </p>
                </div>
                <div class="footer">
                    <p>Generated by AI Meeting Hub</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = html_template.render(
            meeting_title=meeting_title,
            summary_text=summary_text,
            meeting_link=meeting_link,
        )
        return self._send_email([to_email], subject, html_content)

    def send_meeting_invitation(self, to_email: str, meeting_title: str, scheduled_at: str, meeting_link: str) -> bool:
        """Send meeting invitation email."""
        subject = f"Meeting Invitation: {meeting_title}"
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head><style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #764ba2; color: white; padding: 20px; 
                      text-align: center; border-radius: 10px; }
            .content { padding: 20px; }
            .detail { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0; }
            .button { display: inline-block; padding: 10px 20px; background: #764ba2; 
                      color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Meeting Invitation</h1>
                </div>
                <div class="content">
                    <h2>{{ meeting_title }}</h2>
                    <div class="detail">
                        <p><strong>Scheduled:</strong> {{ scheduled_at }}</p>
                        <p><strong>Meeting Link:</strong> {{ meeting_link }}</p>
                    </div>
                    <p>
                        <a href="{{ meeting_link }}" class="button">Join Meeting</a>
                    </p>
                </div>
                <div class="footer">
                    <p>Powered by AI Meeting Hub</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = html_template.render(
            meeting_title=meeting_title,
            scheduled_at=scheduled_at,
            meeting_link=meeting_link,
        )
        return self._send_email([to_email], subject, html_content)

    def send_password_reset(self, to_email: str, reset_link: str) -> bool:
        """Send password reset email."""
        subject = "Password Reset Request"
        html_template = Template("""
        <!DOCTYPE html>
        <html>
        <head><style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #e74c3c; color: white; padding: 20px; 
                      text-align: center; border-radius: 10px; }
            .content { padding: 20px; }
            .button { display: inline-block; padding: 10px 20px; background: #e74c3c; 
                      color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #999; font-size: 12px; }
        </style></head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Password Reset</h1>
                </div>
                <div class="content">
                    <p>You have requested to reset your password.</p>
                    <p>Click the button below to set a new password:</p>
                    <p>
                        <a href="{{ reset_link }}" class="button">Reset Password</a>
                    </p>
                    <p>If you did not request this, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>Security notice from AI Meeting Hub</p>
                </div>
            </div>
        </body>
        </html>
        """)

        html_content = html_template.render(reset_link=reset_link)
        return self._send_email([to_email], subject, html_content)

