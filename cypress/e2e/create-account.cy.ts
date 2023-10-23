describe('Visit homepage, skip tutorial, signup, go to homepage, go to level, go to level editor, go to profile', () => {
  it('registers', () => {
    cy.visit('http://localhost:3000')
    cy.get('#level-of-day').should('contain', 'Level of the Day')
    // click on link with text "Start"
    cy.get('a').contains('Start').click()
    // we should see two links, one with text "Next" and one with text "Skip"... wait for the button with text "Skip" to appear
    cy.get('button').contains('Skip').should('exist')
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
    cy.get("#title").should('contain', 'Pathology Official Campaign')
    
    // should see 
    cy.visit('http://localhost:3000/home')
    
    // click on link that has the text Skip
    cy.get('button').contains('Skip').click()
    // click on first level-card-link class element
    cy.get('.level-card-link').first().click()
    
    // should have an h1
    cy.get('h1').should('exist')

    // go to level editor
    cy.visit('http://localhost:3000/create')

    // click on a tag with text New Level
    cy.get('a').contains('New Level').click()
    
    // there should buttons labeled Undo, Redo, Size, Data, Modify, and Save
    cy.get('button').contains('Undo').should('exist')
    cy.get('button').contains('Redo').should('exist')
    cy.get('button').contains('Size').should('exist')
    cy.get('button').contains('Data').should('exist')
    cy.get('button').contains('Modify').should('exist')
    cy.get('button').contains('Save').should('exist')

    // all done!

    

  })
  
})