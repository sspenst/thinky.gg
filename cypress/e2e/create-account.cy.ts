describe('Visit homepage, skip tutorial, signup', () => {
  it('passes', () => {
    cy.visit('http://localhost:3000')
    cy.get('#level-of-day').should('contain', 'Level of the Day')
    // click on link with text "Start"
    cy.get('a').contains('Start').click()
    // we should see two links, one with text "Next" and one with text "Skip"
    cy.get('button').contains('Next')
    cy.get('button').contains('Skip').click() // skip the tutorial
    // should see now a button with the text Sign up
    cy.get('button').contains('Sign up').click()
    // now we need to fill in Username, Email, Password, Confirm Password and check the box that has text "I agree"
    
    const randomUsername = 'user-'+Math.random().toString(36).substring(7);
    cy.get('#username').type(randomUsername)

    const randomEmail = 'email-'+Math.random().toString(36).substring(7)+'@example.com';
    cy.get('#email').type(randomEmail)
    cy.get('#password').type('testpassword')
    cy.get('#password2').type('testpassword')
    cy.get('input[type=checkbox]').check()

    // click on the button with text "Sign up"
    cy.get('input[type=submit]').contains('Sign Up').click()

    // should be on the url /play
    cy.url().should('include', '/play')




  })
})