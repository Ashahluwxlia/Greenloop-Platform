export const rewardEmailTemplates = {
  // Email sent to user when they claim a reward
  rewardClaimConfirmation: {
    subject: "Reward Claim Received - GreenLoop",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Reward Claim Received!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi <strong>{{USER_NAME}}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Congratulations on reaching <strong>Level {{LEVEL}}</strong>! We've received your claim for:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 10px 0;">{{REWARD_TITLE}}</h3>
            <p style="color: #6b7280; margin: 0;">{{REWARD_DESCRIPTION}}</p>
          </div>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            <strong>What happens next?</strong><br>
            You will receive an email from our administrator within <strong>24-48 hours</strong> with the next steps for your reward.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{SITE_URL}}/rewards" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View My Rewards
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Keep up the great work on your sustainability journey!<br>
            The GreenLoop Team
          </p>
        </div>
      </div>
    `,
  },

  // Email sent to admin when user claims a reward
  adminRewardNotification: {
    subject: "New Reward Claim - Action Required",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1f2937; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 New Reward Claim</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            A user has claimed a reward and requires admin approval.
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #1f2937; margin: 0 0 15px 0;">Claim Details</h3>
            <p style="margin: 5px 0;"><strong>User:</strong> {{USER_NAME}} ({{USER_EMAIL}})</p>
            <p style="margin: 5px 0;"><strong>Level:</strong> {{LEVEL}}</p>
            <p style="margin: 5px 0;"><strong>Reward:</strong> {{REWARD_TITLE}}</p>
            <p style="margin: 5px 0;"><strong>Description:</strong> {{REWARD_DESCRIPTION}}</p>
            <p style="margin: 5px 0;"><strong>Claimed At:</strong> {{CLAIMED_AT}}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{SITE_URL}}/admin/rewards" style="background: #1f2937; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              Review Claim
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center;">
            Please review and approve/reject this claim within 24-48 hours.
          </p>
        </div>
      </div>
    `,
  },

  // Email sent to user when reward is approved
  rewardApproved: {
    subject: "Reward Approved! - GreenLoop",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">✅ Reward Approved!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi <strong>{{USER_NAME}}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Great news! Your Level {{LEVEL}} reward has been approved:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 10px 0;">{{REWARD_TITLE}}</h3>
            <p style="color: #6b7280; margin: 0;">{{REWARD_DESCRIPTION}}</p>
          </div>
          
          {{#if ADMIN_NOTES}}
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">📝 Admin Notes:</h4>
            <p style="color: #92400e; margin: 0;">{{ADMIN_NOTES}}</p>
          </div>
          {{/if}}
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            <strong>Next Steps:</strong><br>
            Please follow the instructions in the admin notes above, or contact us if you need any clarification.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{SITE_URL}}/rewards" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View My Rewards
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Thank you for your commitment to sustainability!<br>
            The GreenLoop Team
          </p>
        </div>
      </div>
    `,
  },

  // Email sent to user when reward is delivered
  rewardDelivered: {
    subject: "Reward Delivered! - GreenLoop",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">🚀 Reward Delivered!</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb;">
          <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
            Hi <strong>{{USER_NAME}}</strong>,
          </p>
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            Your Level {{LEVEL}} reward has been successfully delivered:
          </p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
            <h3 style="color: #10b981; margin: 0 0 10px 0;">{{REWARD_TITLE}}</h3>
            <p style="color: #6b7280; margin: 0;">{{REWARD_DESCRIPTION}}</p>
          </div>
          
          {{#if ADMIN_NOTES}}
          <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <h4 style="color: #92400e; margin: 0 0 10px 0;">📝 Delivery Notes:</h4>
            <p style="color: #92400e; margin: 0;">{{ADMIN_NOTES}}</p>
          </div>
          {{/if}}
          
          <p style="font-size: 16px; color: #374151; line-height: 1.6;">
            We hope you enjoy your reward! Keep up the amazing work on your sustainability journey.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="{{SITE_URL}}/rewards" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
              View My Rewards
            </a>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; text-align: center; margin-top: 30px;">
            Thank you for making a difference!<br>
            The GreenLoop Team
          </p>
        </div>
      </div>
    `,
  },
}

// Helper function to replace template variables
export function replaceEmailVariables(template: string, variables: Record<string, string>): string {
  let result = template
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, "g")
    result = result.replace(regex, value || "")
  })

  // Handle conditional blocks like {{#if ADMIN_NOTES}}
  result = result.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, variable, content) => {
    return variables[variable] ? content : ""
  })

  return result
}
